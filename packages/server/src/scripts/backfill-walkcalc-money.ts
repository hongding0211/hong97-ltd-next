import mongoose from 'mongoose'
import {
  WalkcalcGroup,
  WalkcalcGroupSchema,
} from '../modules/walkcalc/schema/walkcalc-group.schema'
import { backfillWalkcalcGroupMoney } from '../modules/walkcalc/utils/money-migration'
import { WalkcalcMoneyMigrationIssue } from '../modules/walkcalc/utils/money-migration'

async function main() {
  const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017'
  const dbName = process.env.MONGODB_DB_NAME || 'test'

  await mongoose.connect(uri, { dbName })
  const WalkcalcGroupModel = mongoose.model(
    WalkcalcGroup.name,
    WalkcalcGroupSchema,
  )
  const groups = await WalkcalcGroupModel.find({}).exec()
  const issues: WalkcalcMoneyMigrationIssue[] = []
  let changedCount = 0

  for (const group of groups) {
    const result = backfillWalkcalcGroupMoney(group)
    issues.push(...result.issues)
    if (!result.changed || result.issues.length) {
      continue
    }

    await group.save()
    changedCount += 1
  }

  if (issues.length) {
    console.error(JSON.stringify({ changedCount, issues }, null, 2))
    process.exitCode = 1
  } else {
    console.log(JSON.stringify({ changedCount, issues }, null, 2))
  }

  await mongoose.disconnect()
}

main().catch(async (err) => {
  console.error(err)
  await mongoose.disconnect()
  process.exit(1)
})
