/** Platform revenue-share architecture for creators, agent developers, apps, teachers, businesses. */

export function defaultRevenueShares() {
  return {
    gifts: { creatorBps: 7000, platformBps: 3000 },
    agentSales: { developerBps: 7000, platformBps: 3000 },
    appMarketplace: { developerBps: 8000, platformBps: 2000 },
    courses: { teacherBps: 8500, platformBps: 1500 },
    commerce: { creatorBps: 8500, platformBps: 1500 },
    communityPremium: { ownerBps: 8000, platformBps: 2000 }
  };
}

export function splitAmount(gross, shareBps) {
  const amount = Math.max(0, Number(gross) || 0);
  const party = Math.floor(amount * Number(shareBps) / 10000);
  return { party, platform: amount - party, gross: amount };
}
