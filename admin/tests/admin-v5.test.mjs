import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
const read=(path)=>readFileSync(new URL('../../'+path,import.meta.url),'utf8');

test('V5: màn admin chỉ có 3 phân hệ quyền',()=>{
  const admin=read('admin/js/admin.js');
  assert.match(admin,/\['accounts', 'verification', 'learning'\]/);
  for (const scope of ['accounts','verification','learning']) assert.match(admin,new RegExp(`data-admin-tab|${scope}`));
  assert.match(admin,/requireAuth\(\{ roles: \['admin'\] \}\)/);
});
test('V5: client không có đường tự đăng ký admin',()=>{
  const auth=read('js/services/auth.js');const rules=read('firestore.rules');
  assert.match(rules,/request.resource.data.role in \['buyer','seller'\]/);
  assert.match(rules,/!\('adminPermissions' in request.resource.data\)/);
  assert.match(rules,/request.resource.data.diff\(resource.data\).affectedKeys\(\).hasOnly\(\[/);
  assert.doesNotMatch(auth,/role:\s*['"]admin['"]/);
});
test('V5: người mua chờ duyệt, người bán chờ xác minh',()=>{
  const auth=read('js/services/auth.js');
  assert.match(auth,/accountStatus: role === 'buyer' \? 'pending' : 'active'/);
  assert.match(auth,/sellerStatus: 'pending'/);
  const rules=read('firestore.rules');
  assert.match(rules,/approvedSeller/);
  assert.match(rules,/request.resource.data.status in \['draft','pending'\]/);
});
test('V5: seller không thể tự duyệt người bán và sản phẩm',()=>{
  const rules=read('firestore.rules');
  assert.match(rules,/match \/sellerApplications\/\{uid\}/);
  assert.match(rules,/adminScope\('verification'\)/);
  assert.match(rules,/request.resource.data.status in \['approved','rejected'\]/);
  assert.match(rules,/match \/products\/\{id\}/);
  const seller=read('js/pages/seller-product-form.js');
  assert.match(seller,/persist\('pending', true/);
  assert.doesNotMatch(seller,/persist\('visible', true/);
});
test('V5: bài học sửa ở Firestore, không đưa form sửa cho học viên',()=>{
  assert.match(read('js/services/course-content.js'),/courseLessonOverrides/);
  assert.match(read('js/pages/course-detail.js'),/await loadLessonOverrides\(\)/);
  assert.match(read('js/pages/courses.js'),/await loadLessonOverrides\(\)/);
  assert.doesNotMatch(read('js/pages/course-detail.js'),/lesson-edit/);
});
test('V5: giao diện admin riêng và giữ nguyên nghiệp vụ quản trị gốc',()=>{
  assert.match(read('admin/index.html'),/admin-tabs/);
  assert.match(read('admin/operations.html'),/admin-operations.js/);
  assert.match(read('admin/js/admin-operations.js'),/adminConfirmPayment/);
  assert.match(read('admin/js/admin-operations.js'),/openGrade/);
});
