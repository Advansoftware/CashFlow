import { db } from './src/lib/db';

async function main() {
  const users = await db.systemUser.findMany();
  console.log('--- Users ---');
  console.log(users);

  const loans = await db.loan.findMany({
    include: { installments: true }
  });
  console.log('--- Loans & Installments ---');
  for (const loan of loans) {
    console.log(`Loan ID: ${loan.id}, Original: ${loan.originalAmount}, Total: ${loan.totalAmount}, Status: ${loan.status}`);
    console.log('Installments:');
    for (const inst of loan.installments) {
      console.log(`  - Inst #${inst.installmentNumber}: Amount: ${inst.amount}, Paid: ${inst.paidAmount}, Status: ${inst.status}, DueDate: ${inst.dueDate.toISOString()}, PaidAt: ${inst.paidAt?.toISOString()}`);
    }
  }
}

main().catch(console.error);
