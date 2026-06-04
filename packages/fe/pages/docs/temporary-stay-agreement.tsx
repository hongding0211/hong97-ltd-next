import AppLayout from '@components/app-layout/AppLayout'
import { serverSideTranslations } from 'next-i18next/serverSideTranslations'
import Head from 'next/head'

type Clause = {
  id: string
  zh: string
  en: string
}

const clauses: Clause[] = [
  {
    id: '001',
    zh: '如刘嘉逊产生需要独处并进行自我慰藉之冲动，应前往黄某、丁某住所，或选择依法合规、不会影响他人的公共场所；不得在安峻岑住所内实施、筹备或讨论实施细节。该限制不以安峻岑是否发现为成立条件。',
    en: "Should Liu Jiaxun experience an urge for private self-relief, he shall proceed to the residence of Huang or Ding, or to a lawful public setting where no other person is disturbed. He shall not perform, prepare for, or discuss operational details of such activity inside An Juncen's home. This restriction applies regardless of whether An Juncen becomes aware of it.",
  },
  {
    id: '002',
    zh: '本协议所称“暂住”，预计期限为一个自然月左右。若刘嘉逊在第 31 天仍自然地出现在沙发、客厅、厨房、阳台或冰箱附近，则视为触发“请你说明一下”程序。',
    en: 'The temporary stay contemplated by this agreement shall last approximately one calendar month. If Liu Jiaxun naturally appears near the sofa, living room, kitchen, balcony, or refrigerator on day 31, the “please explain yourself” protocol shall be deemed triggered.',
  },
  {
    id: '003',
    zh: '安峻岑保留对住所秩序、灯光亮度、空调温度、窗帘开合、门锁状态、香薰存在与否及其气味强度的最终解释权。',
    en: 'An Juncen retains final interpretive authority over household order, light levels, air-conditioner temperature, curtain position, lock status, the existence of scented products, and the intensity of any fragrance.',
  },
  {
    id: '004',
    zh: '刘嘉逊可使用客厅、卫生间及经安峻岑明示许可的厨房区域。未经许可，不得打开卧室门、衣柜、抽屉、快递、外卖袋、购物袋、神秘纸袋或任何显然不属于自己的精神领域。',
    en: 'Liu Jiaxun may use the living room, bathroom, and kitchen areas expressly approved by An Juncen. Without permission, he shall not open bedroom doors, wardrobes, drawers, packages, delivery bags, shopping bags, mysterious paper bags, or any emotional territory clearly not his own.',
  },
  {
    id: '005',
    zh: '垃圾应在其存在被安峻岑发现之前完成分类、打包与转移。若垃圾桶出现液体、异味、未知沉积物或“我以为你会扔”的状态，刘嘉逊自动获得一次即时处理义务。',
    en: 'Trash shall be sorted, bagged, and relocated before An Juncen becomes aware of its continued existence. If the bin contains liquid, odor, unknown sediment, or a state of “I thought you were going to take it out,” Liu Jiaxun automatically receives an immediate disposal obligation.',
  },
  {
    id: '006',
    zh: '夜间音量应维持在“邻居不会报警、安峻岑不会沉默、手机不会被没收”的合理区间内。语音通话、短视频外放及突然爆笑均应遵守本条。',
    en: 'Nighttime volume shall remain within the reasonable range where neighbors do not call authorities, An Juncen does not become ominously silent, and no phone is confiscated. Voice calls, short videos on speaker, and sudden laughter are subject to this clause.',
  },
  {
    id: '007',
    zh: '厨房使用后，刘嘉逊应使台面、锅具、碗筷和水槽恢复至“看不出发生过一场生命实验”的状态。若烹饪成品被评价为“你自己吃吧”，不得上诉。',
    en: 'After using the kitchen, Liu Jiaxun shall restore counters, cookware, dishes, and sink to a condition where no life experiment appears to have occurred. If the resulting food is assessed as “you can eat that yourself,” no appeal is available.',
  },
  {
    id: '008',
    zh: '卫生间使用应遵循干湿分离、毛发归集、马桶盖复位、洗漱台无泡沫遗址四项基本原则。违反者应立即完成清洁，并接受安峻岑不超过三十秒的眼神审判。',
    en: 'Bathroom use shall follow four basic principles: wet-dry separation, hair collection, toilet-lid restoration, and no foam ruins on the sink. Violators shall clean immediately and submit to up to thirty seconds of judgmental eye contact from An Juncen.',
  },
  {
    id: '009',
    zh: '刘嘉逊可因其 gay 身份获得安峻岑提供的穿搭意见、情感吐槽席位及有限量八卦听证权；但不得据此主张免洗碗、免倒垃圾、免保持体面。',
    en: 'By virtue of being gay, Liu Jiaxun may receive outfit commentary, a seat for relationship debriefs, and limited gossip-hearing privileges from An Juncen. These privileges do not create exemptions from dishes, trash, or basic dignity.',
  },
  {
    id: '010',
    zh: '访客、临时社交对象、暧昧人士、前任、潜在前任及不知如何定义的人类进入住所前，须提前征得安峻岑同意。安峻岑有权基于直觉、睡眠、妆发状态或纯粹懒得社交而拒绝。',
    en: "Guests, temporary social contacts, flirtations, exes, potential exes, and persons difficult to classify shall not enter the residence without An Juncen's prior consent. An Juncen may refuse based on intuition, sleep needs, hair and makeup status, or simply not wanting to socialize.",
  },
  {
    id: '011',
    zh: '冰箱内食物适用“谁买谁拥有、谁标谁神圣、谁最后一口谁补货”原则。任何写有安峻岑姓名、缩写、贴纸、暗号或明显散发主人气息的物品，均不得擅自食用。',
    en: "Refrigerated items follow the principles of “buyer owns,” “labeled means sacred,” and “last bite restocks.” Anything bearing An Juncen's name, initials, sticker, code, or obvious owner energy shall not be consumed without permission.",
  },
  {
    id: '012',
    zh: '若双方发生争议，应优先通过友好嘲讽、截图举证、复盘聊天记录及一杯饮料解决。若仍无法解决，以安峻岑“这是我家”的最终陈述为准。',
    en: "Disputes shall first be resolved through friendly mockery, screenshot evidence, chat-log review, and one beverage. If unresolved, An Juncen's final statement of “this is my home” shall prevail.",
  },
  {
    id: '013',
    zh: '暂住结束时，刘嘉逊应带走其衣物、充电器、护肤品、精神包袱及任何声称“先放你这儿”的物品。遗留物超过七日未取回的，安峻岑可将其定义为纪念品、证据或垃圾。',
    en: "At the end of the stay, Liu Jiaxun shall remove his clothes, chargers, skincare products, emotional baggage, and all items described as “I'll leave this here for now.” Items left for more than seven days may be classified by An Juncen as souvenirs, evidence, or trash.",
  },
]

export default function TemporaryStayAgreement() {
  return (
    <>
      <Head>
        <title>安峻岑与刘嘉逊暂住协议</title>
        <meta
          name="description"
          content="安峻岑与刘嘉逊暂住协议，中英文同步戏谑版。"
        />
      </Head>
      <AppLayout simplifiedFooter>
        <main className="mx-auto flex w-full max-w-4xl flex-col px-4 pb-16 pt-10 sm:px-8 sm:pb-24 sm:pt-16">
          <header className="border-b border-neutral-200 pb-8 dark:border-neutral-800">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-neutral-500 dark:text-neutral-400">
              Temporary Stay Agreement
            </p>
            <h1 className="mt-4 text-4xl font-bold leading-tight text-neutral-950 dark:text-neutral-50 sm:text-5xl">
              安峻岑与刘嘉逊暂住协议
            </h1>
          </header>

          <section className="grid gap-5 py-8 text-sm leading-6 text-neutral-700 dark:text-neutral-300 sm:grid-cols-2">
            <div>
              <h2 className="text-base font-semibold text-neutral-950 dark:text-neutral-50">
                甲方 / Host
              </h2>
              <p className="mt-2">安峻岑</p>
            </div>
            <div>
              <h2 className="text-base font-semibold text-neutral-950 dark:text-neutral-50">
                乙方 / Temporary Resident
              </h2>
              <p className="mt-2">刘嘉逊</p>
            </div>
            <div>
              <h2 className="text-base font-semibold text-neutral-950 dark:text-neutral-50">
                期限 / Term
              </h2>
              <p className="mt-2">
                约一个月，以双方尚未互相拉黑为自然终止参考。
              </p>
            </div>
            <div>
              <h2 className="text-base font-semibold text-neutral-950 dark:text-neutral-50">
                管辖原则 / Governing Principle
              </h2>
              <p className="mt-2">
                中文为感情基础，英文为仪式感；两者同样有效。
              </p>
            </div>
          </section>

          <ol className="space-y-6">
            {clauses.map((clause) => (
              <li
                key={clause.id}
                className="grid gap-4 border-t border-neutral-200 pt-6 dark:border-neutral-800 md:grid-cols-[5rem_1fr]"
              >
                <span className="font-mono text-sm font-semibold text-neutral-500 dark:text-neutral-400">
                  {clause.id}
                </span>
                <div className="space-y-3">
                  <p className="text-base leading-7 text-neutral-900 dark:text-neutral-100">
                    {clause.zh}
                  </p>
                  <p className="text-sm leading-6 text-neutral-600 dark:text-neutral-400">
                    {clause.en}
                  </p>
                </div>
              </li>
            ))}
          </ol>

          <footer className="mt-12 border-t border-neutral-200 pt-8 text-sm leading-6 text-neutral-500 dark:border-neutral-800 dark:text-neutral-400">
            签署本协议无需笔迹鉴定；任何点头、已读、沉默超过三秒、或回复“行吧”，均可被安峻岑合理解释为已充分理解并接受。
            <br />
            No handwriting analysis is required. Any nod, read receipt, silence
            exceeding three seconds, or reply of “fine” may be reasonably
            interpreted by An Juncen as full understanding and acceptance.
          </footer>
        </main>
      </AppLayout>
    </>
  )
}

export async function getStaticProps({ locale }: { locale: string }) {
  return {
    props: {
      ...(await serverSideTranslations(locale, ['common'])),
    },
  }
}
