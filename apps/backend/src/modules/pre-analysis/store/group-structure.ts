/** Default group structure and competition table. */

export const DEFAULT_COMPETITION_TABLE = [
  {finco: 'Komatsu Astra Finance (KAF)', rate: '9% - 11,5%', purpose: 'HE'},
  {finco: 'Astra Credit Companies (ACC)', rate: '10% - 12%', purpose: 'HE & Vehicles'},
  {finco: 'SAN Finance (SANF)', rate: '10,5% - 11,66%', purpose: 'HE & Vehicles'},
  {finco: 'Mahada Finance', rate: '10,50%', purpose: 'Truck'},
  {finco: 'Adira Finance', rate: '10,54%', purpose: 'HE & Vehicles'},
  {finco: 'Bank Mandiri', rate: '7,5% - 9,5%', purpose: 'HE & Vehicles'},
  {finco: 'BFI Finance', rate: '10,50%', purpose: 'HE'},
  {finco: 'BNI Multifinance', rate: '7,51%', purpose: 'HE'},
  {finco: 'Buana Finance', rate: '14,00%', purpose: 'HE'},
  {finco: 'Clipan Finance', rate: '12,49%', purpose: 'Truck'},
  {finco: 'Dipo Star Finance', rate: '9,66% - 13,76%', purpose: 'Truck'},
  {finco: 'IMFI', rate: '10,00%', purpose: 'HE'},
  {finco: 'SMFL', rate: '10,5% - 11,25%', purpose: 'HE'},
];

export interface GroupShareholder {
  name: string;
  percentage: string;
  role?: string;
}

export interface GroupEntity {
  name: string;
  authorizedCapital: string;
  paidUpCapital: string;
  shareholders: GroupShareholder[];
  management?: string;
}

export interface GroupStructureData {
  holding: GroupEntity;
  subsidiaries: GroupEntity[];
}

export const DEFAULT_GROUP_STRUCTURE: GroupStructureData = {
  holding: {
    name: 'PT STAR (PT Santosa Abadi Raja)',
    authorizedCapital: 'Rp 240 Miliar',
    paidUpCapital: 'Rp 60 Miliar',
    shareholders: [
      {name: 'Hansen Santosa', percentage: '54%', role: 'Presiden Direktur'},
      {name: 'Leonard Santosa', percentage: '34%', role: 'Direktur'},
      {name: 'Oky Santosa', percentage: '12%', role: 'Komisaris'},
    ],
    management: 'Presdir: Hansen Santosa | Direktur: Leonard Santosa | Komisaris: Oky Santosa',
  },
  subsidiaries: [
    {
      name: 'PT PASS (PT Pangan Sejahtera Sentosa)',
      authorizedCapital: 'Rp 40 Miliar',
      paidUpCapital: 'Rp 10 Miliar',
      shareholders: [
        {name: 'PT STAR', percentage: '99%', role: 'Holding'},
        {name: 'Leonard Santosa', percentage: '1%', role: 'Direktur'},
      ],
      management: 'Komisaris: Hansen Santosa',
    },
    {
      name: 'PT HPS (PT Handalan Putra Sentosa)',
      authorizedCapital: 'Rp 160 Miliar',
      paidUpCapital: 'Rp 40 Miliar',
      shareholders: [
        {name: 'PT STAR', percentage: '99%', role: 'Holding'},
        {name: 'Hansen Santosa', percentage: '1%', role: 'Presdir'},
      ],
      management: 'Direktur: Leonard Santosa',
    },
    {
      name: 'PT HTPS (PT Harta Putramas Sentosa)',
      authorizedCapital: 'Rp 80 Miliar',
      paidUpCapital: 'Rp 20 Miliar',
      shareholders: [
        {name: 'PT STAR', percentage: '99%', role: 'Holding'},
        {name: 'Hansen Santosa', percentage: '1%', role: 'Presdir'},
      ],
      management: 'Direktur: Leonard Santosa',
    },
  ],
};
