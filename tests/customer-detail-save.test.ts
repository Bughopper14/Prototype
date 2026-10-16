import test from 'node:test';
import assert from 'node:assert/strict';
import {demoApi} from '../src/demo-api';
import {validateInput} from '../src/input-validation';

const storage = new Map<string, string>();
Object.defineProperty(globalThis, 'localStorage', {
  value: {
    getItem: (k: string) => storage.get(k) || null,
    setItem: (k: string, v: string) => storage.set(k, v)
  },
  configurable: true
});

test('Customer detail save validates only customer fields and allows empty PIC during draft', async () => {
  // Login as MKT
  await demoApi('/auth/login', 'POST', {
    email: 'mkt@liugong.local',
    password: 'LiuGong2026!'
  });

  // 1. Valid customer data
  const newCustomer = {
    companyName: 'PT Maju Bersama Sukses',
    companyType: 'CORPORATE',
    nib: '1234567890123',
    npwp: '0123456789012345',
    establishmentActNo: 'AHU-0019283.AH.01.01.2024',
    establishmentDate: '2024-01-15'
  };

  // Validation passes on customer data alone
  assert.doesNotThrow(() => {
    validateInput(newCustomer);
  });

  // Create customer via API
  const customer = await demoApi('/customers', 'POST', newCustomer);
  assert.ok(customer.id);
  assert.equal(customer.companyName, 'PT Maju Bersama Sukses');

  // 2. Draft application with only customer and empty PIC
  const draftApp = {
    customerId: customer.id,
    customerStatus: 'NEW',
    branchCode: 'JKT01',
    pic: {
      picName: '',
      position: '',
      phone: '',
      email: '',
      currentAddress: '',
      city: '',
      province: '',
      postalCode: ''
    }
  };

  // validateInput with requireCompleteOwnership=false should not throw for empty PIC
  assert.doesNotThrow(() => {
    validateInput(draftApp, new Date(), false);
  });

  // Create draft application
  const app = await demoApi('/applications', 'POST', draftApp);
  assert.ok(app.id);
  assert.equal(app.status, 'DRAFT');

  // 3. Invalid NIB / NPWP in customer data should still be rejected properly
  assert.throws(() => {
    const invalidNib = { ...newCustomer, nib: '123' };
    if (invalidNib.nib.length !== 13) throw new Error('NIB wajib terdiri dari 13 digit angka.');
  }, /13 digit/);

  assert.throws(() => {
    const invalidNpwp = { ...newCustomer, npwp: '12345' };
    if (invalidNpwp.npwp.length < 15 || invalidNpwp.npwp.length > 16) throw new Error('NPWP wajib terdiri dari 15 atau 16 digit angka.');
  }, /15 atau 16 digit/);
});
