import {experienceFromEstablishmentDate} from './experience';

export function ageFromDateOfBirth(value:unknown,now=new Date()){
 const {experienceYears,experienceMonths}=experienceFromEstablishmentDate(value,now);
 return {ageYears:experienceYears,ageMonths:experienceMonths};
}
