/**
 * ============================================================
 *  FILE: js/utils/messages.js
 *  MỤC ĐÍCH: "Từ điển thông báo hệ thống" (MSG-xxx) – đúng nội dung đặc tả.
 *  Tập trung một chỗ để sửa chữ không phải đi tìm khắp code.
 * ============================================================
 */

export const MSG = {
  required: (field) => `Vui lòng nhập ${field}.`,                                   // MSG-VAL-01
  emailFormat: 'Email chưa đúng định dạng. Ví dụ: ten@example.com',                // MSG-VAL-02
  emailTaken: 'Email này đã được sử dụng. Bạn có muốn Đăng nhập không?',            // MSG-VAL-03
  dobInvalid: 'Ngày sinh không hợp lệ. Vui lòng kiểm tra lại.',
  underAge: 'Bạn chưa đủ tuổi để tạo tài khoản.',                                  // MSG-VAL-04
  pwLength: 'Mật khẩu cần từ 8 đến 64 ký tự.',                                     // MSG-VAL-05
  pwCommon: 'Mật khẩu này quá dễ đoán. Hãy chọn mật khẩu dài hơn hoặc khác đi.',
  pwMismatch: 'Hai mật khẩu chưa trùng khớp nhau.',                                 // MSG-VAL-06
  needTerms: 'Bạn cần đồng ý với Điều khoản sử dụng và Chính sách quyền riêng tư để tiếp tục.', // MSG-VAL-07
  needCaptcha: 'Vui lòng xác minh bạn không phải robot.',                           // MSG-VAL-08
  phoneFormat: 'Số điện thoại chưa đúng. Nhập 10 chữ số bắt đầu bằng 0 hoặc dạng +84.',
  phoneTaken: 'Số điện thoại này đã được sử dụng cho một tài khoản khác.',
  loginFail: 'Email hoặc mật khẩu không đúng.',                                    // MSG-LOG-01
  locked: (mmss) => `Bạn đã nhập sai nhiều lần. Vui lòng thử lại sau ${mmss}.`,    // MSG-LOG-02
  hello: (name) => `Xin chào, ${name}!`,                                            // MSG-LOG-03
  loggedOut: 'Bạn đã đăng xuất thành công.',                                        // MSG-LOG-04
  registered: (email) => `Gần xong rồi! Chúng tôi đã gửi email xác minh tới ${email}. Hãy bấm vào liên kết trong email để kích hoạt tài khoản.`, // MSG-REG-01
  system: 'Có sự cố hệ thống xảy ra. Vui lòng thử lại sau ít phút.',                // MSG-SYS-01
  resetSent: 'Nếu email này đã đăng ký, chúng tôi đã gửi hướng dẫn đặt lại mật khẩu.', // REQ-PWD-02
  unverified: 'Tài khoản của bạn chưa được xác minh email. Hãy kiểm tra hộp thư hoặc gửi lại email xác minh.'
};
