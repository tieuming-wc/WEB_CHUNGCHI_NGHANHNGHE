/**
 * ============================================================
 *  FILE: js/services/orders.js
 *  MỤC ĐÍCH: Toàn bộ nghiệp vụ ĐƠN HÀNG – dùng chung cho người mua, người bán và quản trị.
 *  Bám đặc tả: trạng thái đơn, thanh toán, hủy, giao hàng, hoàn thành, trả hàng/hoàn tiền, đánh giá.
 *
 *  Quy tắc cốt lõi:
 *   - Mỗi đơn chỉ có MỘT trạng thái chính (STATUS). Trạng thái thanh toán (PAY) và yêu cầu
 *     trả hàng (returnReq) là thông tin RIÊNG, không suy ra lẫn nhau.
 *   - Mọi thay đổi đều đi qua transition(): kiểm tra lại trạng thái MỚI NHẤT trong giao dịch;
 *     nếu đã đổi thì báo lỗi 'stale' để giao diện tải lại (đặc tả mục 8.2).
 *   - Mọi thao tác ghi vào history (thời gian – việc làm – bên thực hiện) để đối chiếu tranh chấp.
 * ============================================================
 */
import { backend } from './db.js';
import { APP } from '../config/app-config.js';
import { variantsOf } from './products.js';

// ---------- Nhãn hiển thị ----------
export const STATUS = {
  pending_payment: 'Chờ thanh toán', pending_confirm: 'Chờ xác nhận', awaiting_shipment: 'Chờ giao hàng',
  shipping: 'Đang giao', delivered: 'Đã giao', completed: 'Hoàn thành', cancelled: 'Đã hủy'
};
export const PAY = {
  unpaid: 'Chưa thanh toán', proof: 'Đã gửi chứng từ – chờ xác nhận', paid: 'Đã thanh toán',
  refund_pending: 'Chờ xử lý hoàn tiền', refunded: 'Đã hoàn tiền'
};
export const RETURN_STATUS = { pending: 'Chờ xử lý', approved: 'Được chấp thuận', rejected: 'Bị từ chối', refunded: 'Đã hoàn tiền' };
export const PAY_METHOD = { cod: 'Thanh toán khi nhận hàng (COD)', bank: 'Chuyển khoản trước' };

/** Các thẻ (tab) lọc đơn – các thẻ trạng thái chính loại trừ nhau; "Trả hàng/Hoàn tiền" là thẻ theo dõi riêng */
export const TABS = [
  ['all', 'Tất cả'], ['pending_payment', 'Chờ thanh toán'], ['pending_confirm', 'Chờ xác nhận'],
  ['awaiting_shipment', 'Chờ giao hàng'], ['shipping', 'Đang giao'], ['delivered', 'Đã giao'],
  ['completed', 'Hoàn thành'], ['cancelled', 'Đã hủy'], ['return', 'Trả hàng/Hoàn tiền']
];
export const matchesTab = (o, tab) => tab === 'all' || (tab === 'return' ? !!o.returnReq : o.status === tab);

const err = (code, message) => Object.assign(new Error(message || code), { code });

// ============================================================
//  TỒN KHO (giữ hàng khi đặt, trả lại khi hủy)
// ============================================================
/** Trả về phần cần cập nhật cho sản phẩm khi tăng/giảm tồn kho của 1 phiên bản */
function stockPatch(product, variantId, delta) {
  const list = variantsOf(product);
  const v = list.find((x) => x.id === variantId);
  if (!v) throw err('variant-missing', 'Phiên bản sản phẩm không còn tồn tại.');
  const next = (Number(v.stock) || 0) + delta;
  if (next < 0) throw err('out-of-stock', `"${product.name}" chỉ còn ${v.stock} sản phẩm.`);
  if (product.variants?.length) return { variants: product.variants.map((x) => (x.id === variantId ? { ...x, stock: next } : x)) };
  return { stock: next };
}

async function adjustStock(items, sign) {
  const done = [];
  try {
    for (const it of items) {
      await backend.transact('products', it.productId, (p) => {
        // Khi đặt hàng, sản phẩm phải còn hiển thị và (với hàng làm theo đơn) đang nhận đơn
        if (sign < 0 && (p.status !== 'visible' || (p.mode === 'made_to_order' && p.accepting === false))) {
          throw err('unavailable', `"${p.name}" hiện không nhận đặt hàng.`);
        }
        return stockPatch(p, it.variantId, sign * it.qty);
      });
      done.push(it);
    }
  } catch (e) {
    for (const it of done) await backend.transact('products', it.productId, (p) => stockPatch(p, it.variantId, -sign * it.qty)).catch(() => {});
    throw e;                                                    // hoàn lại phần đã trừ rồi báo lỗi
  }
}

// ============================================================
//  TẠO ĐƠN
// ============================================================
const newOrderId = () => 'BTV' + Date.now().toString(36).toUpperCase() + Math.random().toString(36).slice(2, 5).toUpperCase();

/**
 * Tạo đơn từ các dòng giỏ hàng đã chọn. Giỏ có nhiều gian hàng → TÁCH thành nhiều đơn,
 * mỗi đơn có mã, phí vận chuyển và trạng thái riêng.
 * lines: kết quả resolveCart() đã lọc các dòng hợp lệ.
 */
export async function createOrders({ buyer, lines, address, payMethod, notes = {} }) {
  const byShop = new Map();
  for (const l of lines) {
    if (!byShop.has(l.product.sellerId)) byShop.set(l.product.sellerId, []);
    byShop.get(l.product.sellerId).push(l);
  }
  const groupId = 'G' + Date.now().toString(36);
  const created = [];
  for (const [sellerId, group] of byShop) {
    const items = group.map((l) => ({
      productId: l.productId, variantId: l.variantId, name: l.product.name, variantName: l.variant.name || '',
      price: l.variant.price, qty: l.qty, image: l.product.images?.[0] || '',
      prepDays: l.product.mode === 'made_to_order' ? l.product.prepDays || 0 : l.product.prepDays || 0,
      made: l.product.mode === 'made_to_order'
    }));
    await adjustStock(items, -1);                               // giữ hàng; lỗi thì ném ra và các đơn trước đó vẫn hợp lệ
    const itemsTotal = items.reduce((s, i) => s + i.price * i.qty, 0);
    const now = Date.now();
    const prepend = payMethod === 'bank';
    const order = {
      groupId, buyerId: buyer.uid, buyerName: buyer.name, sellerId, shopName: group[0].product.shopName,
      items, itemsTotal, shipFee: APP.SHIP_FEE, discount: 0, total: itemsTotal + APP.SHIP_FEE,
      address, note: notes[sellerId] || '', payMethod,
      status: prepend ? 'pending_payment' : 'pending_confirm',   // COD vào thẳng "Chờ xác nhận"
      payStatus: 'unpaid', payDeadline: prepend ? now + APP.PAY_DEADLINE_HOURS * 3600000 : null,
      createdAt: now, updatedAt: now,
      history: [{ t: now, by: 'buyer', action: 'Đặt hàng' }]
    };
    const id = newOrderId();
    await backend.set('orders', id, order);
    created.push({ id, ...order });
  }
  return created;
}

// ============================================================
//  ĐỌC ĐƠN
// ============================================================
export const getOrder = (id) => backend.get('orders', id);
export const buyerOrders = (uid) => backend.list('orders', [['buyerId', '==', uid]]);
export const sellerOrders = (uid) => backend.list('orders', [['sellerId', '==', uid]]);
export const ordersByStatus = (status) => backend.list('orders', [['status', '==', status]]);

// ============================================================
//  CHUYỂN TRẠNG THÁI AN TOÀN
// ============================================================
/**
 * allowed: danh sách trạng thái được phép thực hiện thao tác
 * fn(order) → { patch, action }  (ném lỗi nếu không đủ điều kiện)
 */
async function transition(orderId, by, allowed, fn) {
  let result;
  await backend.transact('orders', orderId, (o) => {
    if (allowed && !allowed.includes(o.status)) throw err('stale', 'Trạng thái đơn hàng đã thay đổi. Vui lòng xem lại.');
    const { patch, action } = fn(o);
    result = { ...o, ...patch };
    return { ...patch, updatedAt: Date.now(), history: [...(o.history || []), { t: Date.now(), by, action }] };
  });
  return result;
}

/** Nếu đơn đã trả tiền hoặc đã gửi chứng từ → chuyển sang "chờ hoàn tiền" */
const refundState = (o) => (['paid', 'proof'].includes(o.payStatus) ? 'refund_pending' : o.payStatus);

// ---------- Người mua ----------
/** Hủy đơn ở "Chờ thanh toán" / "Chờ xác nhận" (phải có lý do) */
export async function buyerCancel(orderId, reason) {
  const o = await transition(orderId, 'buyer', ['pending_payment', 'pending_confirm'], (cur) => ({
    patch: { status: 'cancelled', payStatus: refundState(cur), cancel: { by: 'buyer', reason, at: Date.now() } },
    action: `Người mua hủy đơn: ${reason}`
  }));
  await adjustStock(o.items, +1);                               // trả lại hàng đã giữ
  return o;
}

/** Yêu cầu hủy khi đã "Chờ giao hàng" – CHƯA hủy ngay, phải chờ người bán xử lý */
export const buyerRequestCancel = (orderId, reason) => transition(orderId, 'buyer', ['awaiting_shipment'], (o) => {
  if (o.cancelRequest?.status === 'pending') throw err('dup', 'Bạn đã gửi yêu cầu hủy cho đơn này.');
  return { patch: { cancelRequest: { reason, status: 'pending', at: Date.now() } }, action: `Người mua yêu cầu hủy: ${reason}` };
});

/** Người mua gửi ảnh chuyển khoản → chờ quản trị xác nhận đã nhận tiền */
export const buyerSubmitProof = (orderId, image) => transition(orderId, 'buyer', ['pending_payment'], (o) => {
  if (Date.now() > o.payDeadline) throw err('expired', 'Đơn đã quá hạn thanh toán.');
  return { patch: { payStatus: 'proof', proofImage: image }, action: 'Người mua gửi chứng từ chuyển khoản' };
});

/** Xác nhận đã nhận hàng – chỉ khi đã giao VÀ đã thanh toán đầy đủ */
export const buyerConfirmReceived = (orderId) => transition(orderId, 'buyer', ['delivered'], (o) => {
  if (o.payStatus !== 'paid') throw err('unpaid', 'Đã giao – thanh toán đang chờ xác nhận. Đơn chưa thể hoàn thành.');
  return { patch: { status: 'completed', completedAt: Date.now() }, action: 'Người mua xác nhận đã nhận hàng' };
});

/** Còn trong thời hạn trả hàng không? (tính từ lúc giao thành công) */
export const returnDeadline = (o) => (o.deliveredAt || 0) + APP.RETURN_WINDOW_HOURS * 3600000;
export const canRequestReturn = (o) => ['delivered', 'completed'].includes(o.status) && !o.returnReq && Date.now() <= returnDeadline(o);

export const requestReturn = (orderId, data) => transition(orderId, 'buyer', ['delivered', 'completed'], (o) => {
  if (o.returnReq) throw err('dup', 'Đơn này đã có yêu cầu trả hàng/hoàn tiền.');
  if (Date.now() > returnDeadline(o)) throw err('late', 'Đã quá thời hạn yêu cầu trả hàng/hoàn tiền.');
  return { patch: { returnReq: { ...data, amount: o.itemsTotal, status: 'pending', at: Date.now() } }, action: `Người mua yêu cầu ${data.kind === 'return' ? 'trả hàng & hoàn tiền' : 'hoàn tiền'}: ${data.reason}` };
});

/** Tự hủy các đơn trả trước quá hạn thanh toán (gọi khi mở trang Đơn mua) */
export async function expireUnpaid(orders) {
  for (const o of orders) {
    if (o.status === 'pending_payment' && o.payStatus === 'unpaid' && o.payDeadline && Date.now() > o.payDeadline) {
      try {
        const done = await transition(o.id, 'system', ['pending_payment'], () => ({
          patch: { status: 'cancelled', cancel: { by: 'system', reason: 'Quá hạn thanh toán', at: Date.now() } }, action: 'Tự động hủy: quá hạn thanh toán'
        }));
        await adjustStock(done.items, +1);
        Object.assign(o, done);
      } catch { /* đơn đã đổi trạng thái, bỏ qua */ }
    }
  }
}

// ---------- Người bán ----------
export const sellerConfirm = (orderId) => transition(orderId, 'seller', ['pending_confirm'], (o) => {
  const days = Math.max(0, ...o.items.map((i) => i.prepDays || 0));
  return { patch: { status: 'awaiting_shipment', handoverDue: Date.now() + Math.max(days, 1) * 86400000 }, action: 'Người bán xác nhận đơn' };
});

export async function sellerReject(orderId, reason) {
  const o = await transition(orderId, 'seller', ['pending_confirm'], (cur) => ({
    patch: { status: 'cancelled', payStatus: refundState(cur), cancel: { by: 'seller', reason, at: Date.now() } },
    action: `Người bán từ chối đơn: ${reason}`
  }));
  await adjustStock(o.items, +1);
  return o;
}

/** Bàn giao cho vận chuyển. Bị chặn khi đang có yêu cầu hủy chờ xử lý */
export const sellerHandover = (orderId, carrier, code) => transition(orderId, 'seller', ['awaiting_shipment'], (o) => {
  if (o.cancelRequest?.status === 'pending') throw err('cancel-pending', 'Đang có yêu cầu hủy chờ xử lý. Hãy xử lý yêu cầu trước khi bàn giao.');
  return { patch: { status: 'shipping', tracking: { carrier, code, at: Date.now() } }, action: `Bàn giao vận chuyển (${carrier} – ${code})` };
});

/** Chấp thuận / từ chối yêu cầu hủy của người mua */
export async function sellerDecideCancel(orderId, approve, reason = '') {
  const o = await transition(orderId, 'seller', ['awaiting_shipment'], (cur) => {
    if (cur.cancelRequest?.status !== 'pending') throw err('stale', 'Không còn yêu cầu hủy nào chờ xử lý.');
    return approve
      ? { patch: { status: 'cancelled', payStatus: refundState(cur), cancelRequest: { ...cur.cancelRequest, status: 'approved' }, cancel: { by: 'buyer', reason: cur.cancelRequest.reason, at: Date.now() } }, action: 'Người bán chấp thuận yêu cầu hủy' }
      : { patch: { cancelRequest: { ...cur.cancelRequest, status: 'rejected', rejectReason: reason } }, action: `Người bán từ chối yêu cầu hủy: ${reason}` };
  });
  if (approve) await adjustStock(o.items, +1);
  return o;
}

export const sellerDecideReturn = (orderId, approve, reason = '') => transition(orderId, 'seller', null, (o) => {
  if (o.returnReq?.status !== 'pending') throw err('stale', 'Yêu cầu này không còn ở trạng thái chờ xử lý.');
  if (!approve && !reason) throw err('reason', 'Từ chối phải nhập lý do.');
  return {
    patch: { returnReq: { ...o.returnReq, status: approve ? 'approved' : 'rejected', sellerNote: reason, decidedAt: Date.now() }, ...(approve ? { payStatus: 'refund_pending' } : {}) },
    action: approve ? 'Người bán chấp thuận trả hàng/hoàn tiền' : `Người bán từ chối trả hàng/hoàn tiền: ${reason}`
  };
});

// ---------- Quản trị (đóng vai trò hệ thống thanh toán / đơn vị vận chuyển) ----------
export const adminConfirmPayment = (orderId) => transition(orderId, 'admin', null, (o) => {
  if (o.payStatus !== 'proof') throw err('stale', 'Đơn không ở trạng thái chờ xác nhận thanh toán.');
  return { patch: { payStatus: 'paid', ...(o.status === 'pending_payment' ? { status: 'pending_confirm' } : {}) }, action: 'Hệ thống xác nhận đã nhận tiền' };
});
export const adminMarkDelivered = (orderId) => transition(orderId, 'admin', ['shipping'], () => ({ patch: { status: 'delivered', deliveredAt: Date.now() }, action: 'Đơn vị vận chuyển xác nhận giao thành công' }));
export const adminCollectCod = (orderId) => transition(orderId, 'admin', ['delivered', 'completed'], (o) => {
  if (o.payMethod !== 'cod' || o.payStatus !== 'unpaid') throw err('stale', 'Đơn không cần xác nhận thu tiền COD.');
  return { patch: { payStatus: 'paid' }, action: 'Xác nhận đã thu tiền COD' };
});
export const adminRefund = (orderId) => transition(orderId, 'admin', null, (o) => {
  if (o.payStatus !== 'refund_pending') throw err('stale', 'Đơn không ở trạng thái chờ hoàn tiền.');
  return { patch: { payStatus: 'refunded', ...(o.returnReq?.status === 'approved' ? { returnReq: { ...o.returnReq, status: 'refunded' } } : {}) }, action: 'Xác nhận đã hoàn tiền' };
});

// ============================================================
//  ĐÁNH GIÁ SẢN PHẨM (chỉ với đơn Hoàn thành; mỗi dòng 1 đánh giá)
// ============================================================
export const reviewKey = (orderId, item) => `${orderId}_${item.productId}_${item.variantId}`;

export async function submitReview(order, item, { rating, text, images, userName, userId }) {
  if (order.status !== 'completed') throw err('not-completed', 'Bạn chỉ có thể đánh giá sản phẩm sau khi đơn hàng hoàn thành.');
  const id = reviewKey(order.id, item);
  if (await backend.get('reviews', id)) throw err('dup', 'Bạn đã đánh giá sản phẩm này.');
  await backend.set('reviews', id, {
    productId: item.productId, orderId: order.id, variantName: item.variantName, userId, userName,
    rating, text, images, createdAt: Date.now()
  });
  // Cộng vào điểm tổng của sản phẩm (chỉ khi đã lưu đánh giá thành công)
  await backend.transact('products', item.productId, (p) => ({ ratingSum: (p.ratingSum || 0) + rating, ratingCount: (p.ratingCount || 0) + 1 }));
  await backend.transact('orders', order.id, (o) => ({ reviewed: { ...(o.reviewed || {}), [item.productId + '_' + item.variantId]: true } }));
}

export const hasReviewed = (order, item) => !!order.reviewed?.[item.productId + '_' + item.variantId];
