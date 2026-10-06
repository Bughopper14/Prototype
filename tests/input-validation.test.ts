import test from 'node:test';
import assert from 'node:assert/strict';
import {fieldInputError,inputLimits,validateInput,businessToday} from '../src/input-validation';
const now=new Date('2026-10-01T03:00:00Z');
test('historical dates reject future and invalid calendar dates; expiry may be future',()=>{
 for(const key of ['deedDate','ministerialDecreeDate','establishmentDate','latestDeedDate','dateOfBirth','registrationDate']){assert(fieldInputError(key,'2027-01-01',now));assert(fieldInputError(key,'2026-10-02',now));assert(fieldInputError(key,'2026-02-30',now));assert.equal(fieldInputError(key,'2024-02-29',now),'');}
 assert.doesNotThrow(()=>validateInput({registrationDate:'2026-01-01',expiredDate:'2031-01-01'},now));
 assert.throws(()=>validateInput({registrationDate:'2026-01-01',expiredDate:'2025-12-31'},now));
 assert.throws(()=>validateInput({deedDate:'2026-01-02',ministerialDecreeDate:'2026-01-01'},now));
 assert.equal(businessToday(new Date('2026-12-31T18:00:00Z')),'2027-01-01');
});
test('years, counts, percentages and numeric ranges apply recursively',()=>{
 for(const data of [{bankReferences:[{yearStarted:2027}]},{proposal:{units:[{years:2027}]}},{financialStatements:[{fiscalYear:2027}]},{quantity:1.5},{quantity:0},{experienceMonths:12},{ageMonths:-1},{interestRate:101},{sharePercentage:120},{primaryCapital:-1},{financingValue:100,downPaymentValue:100},{tenorMonths:121},{classTon:0}])assert.throws(()=>validateInput(data,now));
 assert.throws(()=>validateInput({legal:{deeds:[{stakeholders:[{sharePercentage:90},{sharePercentage:30}]}]}},now));
 assert.doesNotThrow(()=>validateInput({legal:{deeds:[{stakeholders:[{sharePercentage:90},{sharePercentage:10}]}]}},now));
 assert.equal(inputLimits('years',now).max,2026);
});
test('identity, contact and financial checks preserve legitimate negative profit',()=>{
 for(const data of [{email:'broken'},{mobilePhone:'abc123'},{rt:'1234'},{idType:'KTP',idNumber:'123'},{nib:'123'},{npwp:'123'}])assert.throws(()=>validateInput(data,now));
 const financial={fiscalYear:2025,currentAssets:10,nonCurrentAssets:20,totalAssets:30,currentLiabilities:10,nonCurrentLiabilities:10,totalLiabilities:20,equity:10,totalLiabAndEquity:30,netIncome:-5,grossMargin:-2};
 assert.doesNotThrow(()=>validateInput({financialStatements:[financial]},now));
 assert.throws(()=>validateInput({financialStatements:[{...financial,totalAssets:31}]},now));
 assert.throws(()=>validateInput({financialStatements:[financial,{...financial}]},now));
 assert.throws(()=>validateInput({primaryCapital:'NaN'},now));
 assert.throws(()=>validateInput({primaryCapital:'1.234'},now));
});

test('draft ownership can be saved incrementally; submission requires 100 percent',()=>{assert.doesNotThrow(()=>validateInput({stakeholders:[{sharePercentage:50}]},now));assert.throws(()=>validateInput({stakeholders:[{sharePercentage:50}]},now,true));assert.throws(()=>validateInput({stakeholders:[{sharePercentage:90},{sharePercentage:30}]},now));});
test('explicit ID type overrides corporate and citizenship defaults',()=>{assert.throws(()=>validateInput({stakeholderType:'CORPORATE',idType:'KTP',idNumber:'123456789012345'},now),/KTP/);assert.doesNotThrow(()=>validateInput({stakeholderType:'CORPORATE',idType:'KTP',idNumber:'1234567890123456'},now));assert.throws(()=>validateInput({nationalityType:'WNA',idType:'KTP',idNumber:'AB12345'},now),/KTP/);assert.doesNotThrow(()=>validateInput({stakeholderType:'CORPORATE',idType:'PASSPORT',idNumber:'AB12345'},now));});

test('current deed list supersedes legacy duplicate validation and identifies invalid visible deed',()=>{assert.doesNotThrow(()=>validateInput({legal:{deeds:[{deedNumber:'CURRENT',deedDate:'2026-01-01'}],establishment:{deedDate:'3333-12-31'}}},now));assert.throws(()=>validateInput({legal:{deeds:[{deedNumber:'INVALID',deedDate:'3333-12-31'}]}},now),/Akta INVALID/);});
