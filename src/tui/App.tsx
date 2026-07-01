import { useState } from "react"
import { products, type ProductKey } from "../products.ts"
import { loadConfig, missingUpstashVars } from "../config.ts"
import { HomeView } from "./views/HomeView.tsx"
import { RedisDashboard } from "./views/RedisDashboard.tsx"
import { QStashView } from "./views/QStashView.tsx"
import { WorkflowView } from "./views/WorkflowView.tsx"
import { VectorView } from "./views/VectorView.tsx"
import { ComingSoonView } from "./views/ComingSoonView.tsx"
import { SetupView } from "./views/SetupView.tsx"

type Route = { view: "home" } | { view: "product"; key: ProductKey }

export function App() {
  const [config, setConfig] = useState(() => loadConfig())
  const [route, setRoute] = useState<Route>({ view: "home" })
  const [demo, setDemo] = useState(false)

  const goHome = () => setRoute({ view: "home" })

  // Tab / Shift+Tab cycles the active product across the top nav.
  const cycle = (delta: number) => {
    setRoute((r) => {
      if (r.view !== "product") return r
      const i = products.findIndex((p) => p.key === r.key)
      const next = products[(i + delta + products.length) % products.length]!
      return { view: "product", key: next.key }
    })
  }

  if (route.view === "home") {
    return <HomeView onOpen={(key) => setRoute({ view: "product", key })} />
  }

  if (route.key === "qstash") {
    return <QStashView creds={config.qstash} onHome={goHome} onCycle={cycle} />
  }

  if (route.key === "workflow") {
    return <WorkflowView creds={config.qstash} onHome={goHome} onCycle={cycle} />
  }

  if (route.key === "vector") {
    return <VectorView creds={config.upstash} onHome={goHome} onCycle={cycle} />
  }

  if (route.key !== "redis") {
    return <ComingSoonView productKey={route.key} onBack={goHome} onCycle={cycle} />
  }

  // Redis: live if creds present, demo if the user opted in, otherwise setup.
  if (config.upstash) {
    return (
      <RedisDashboard mode="live" creds={config.upstash} openrouter={config.openrouter} onHome={goHome} onCycle={cycle} />
    )
  }
  if (demo) {
    return <RedisDashboard mode="demo" creds={null} openrouter={config.openrouter} onHome={goHome} onCycle={cycle} />
  }

  return (
    <SetupView
      missing={missingUpstashVars()}
      hasOpenRouter={!!config.openrouter}
      onRetry={() => setConfig(loadConfig())}
      onDemo={() => setDemo(true)}
    />
  )
}
