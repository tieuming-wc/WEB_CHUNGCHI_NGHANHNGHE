import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { resolve, dirname } from 'node:path';
const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const read = p => readFileSync(resolve(root, p), 'utf8');
test('V5.1 Admin ở một thư mục riêng, không xóa Rules dùng chung', () => {
 for (const p of ['admin/index.html','admin/operations.html','admin/js/admin.js','admin/js/admin-operations.js','admin/js/admin-workflows.js','admin/css/admin.css','admin/README.md','firestore.rules']) assert.ok(existsSync(resolve(root,p)), p);
 for (const p of ['pages/admin.html','pages/admin-operations.html','js/pages/admin.js','js/pages/admin-operations.js','css/pages/admin.css','js/services/admin-workflows.js']) assert.ok(!existsSync(resolve(root,p)), `file cũ vẫn còn: ${p}`);
});
test('Link từ menu, đăng nhập, người bán sang vị trí mới',()=>{
 assert.match(read('js/utils/paths.js'),/admin\/index\.html/);
 assert.match(read('js/pages/login.js'),/'admin\/index\.html'/);
 assert.match(read('js/pages/seller-shop.js'),/admin\/js\/admin-workflows\.js/);
 assert.match(read('admin/js/admin.js'),/href="operations\.html"/);
});
test('HTML admin trỏ đúng CSS JS và các file module nhập vào tồn tại',()=>{
 for(const p of ['admin/index.html','admin/operations.html']) {
  const html=read(p);
  for (const match of html.matchAll(/(?:src|href)="([^"]+)"/g)) {
   if (/^(?:https?:|#|mailto:)/.test(match[1])) continue;
   assert.ok(existsSync(resolve(dirname(resolve(root,p)),match[1])), `${p} => ${match[1]}`);
  }
 }
 for(const p of ['admin/js/admin.js','admin/js/admin-operations.js','admin/js/admin-workflows.js','js/pages/seller-shop.js']) {
  for (const match of read(p).matchAll(/from\s+['"]([^'"]+)['"]/g)) {
   if(!match[1].startsWith('.')) continue;
   assert.ok(existsSync(resolve(dirname(resolve(root,p)),match[1])), `${p} => ${match[1]}`);
  }
 }
});
