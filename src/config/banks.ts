export interface BankPreset {
  id: string;
  name: string;
  defaultAccountName: string;
  defaultAccountNumber: string;
}

export const MALAYSIAN_BANKS: BankPreset[] = [
  {
    id: 'cimb',
    name: 'CIMB Bank Berhad',
    defaultAccountName: 'CIMB CashPlus Financing Berhad',
    defaultAccountNumber: '7088921401',
  },
  {
    id: 'maybank',
    name: 'Malayan Banking Berhad (Maybank)',
    defaultAccountName: 'CIMB Collection Escrow',
    defaultAccountNumber: '514012984501',
  },
  {
    id: 'public',
    name: 'Public Bank Berhad',
    defaultAccountName: 'CIMB Repayment Division',
    defaultAccountNumber: '3190827311',
  },
  {
    id: 'rhb',
    name: 'RHB Bank Berhad',
    defaultAccountName: 'CIMB Financing Collection',
    defaultAccountNumber: '214012001982',
  },
  {
    id: 'hongleong',
    name: 'Hong Leong Bank Berhad',
    defaultAccountName: 'CIMB Cash Plus Settlement',
    defaultAccountNumber: '00600198234',
  },
  {
    id: 'ambank',
    name: 'AmBank (M) Berhad',
    defaultAccountName: 'CIMB Financing Services',
    defaultAccountNumber: '888102938471',
  },
  {
    id: 'bankislam',
    name: 'Bank Islam Malaysia Berhad',
    defaultAccountName: 'CIMB Cash Plus Settlement',
    defaultAccountNumber: '14012020987654',
  },
  {
    id: 'tng',
    name: "Touch 'n Go eWallet",
    defaultAccountName: 'CIMB Digital Payments',
    defaultAccountNumber: '0129837461',
  },
];
