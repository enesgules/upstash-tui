import { useState } from "react"
import type { ProductKey } from "../products.ts"
import { loadConfig } from "../config.ts"
import { HomeView } from "./views/HomeView.tsx"
import { RedisDashboard } from "./views/RedisDashboard.tsx"
import { QStashView } from "./views/QStashView.tsx"
import { VectorView } from "./views/VectorView.tsx"
import { ComingSoonView } from "./views/ComingSoonView.tsx"
import { SetupView } from "./views/SetupView.tsx"

type Route = { view: "home" } | { view: "product"; key: ProductKey }

export function App() {
  const [config, setConfig] = useState(() => loadConfig())
  const [route, setRoute] = useState<Route>({ view: "home" })
  const [demo, setDemo] = useState(false)

  const goHome = () => setRoute({ view: "home" })

  if (route.view === "home") {
    return <HomeView onOpen={(key) => setRoute({ view: "product", key })} />
  }

  if (route.key === "qstash") {
    return <QStashView creds={config.qstash} onHome={goHome} />
  }

  if (route.key === "vector") {
    return <VectorView creds={config.upstash} onHome={goHome} />
  }

  if (route.key !== "redis") {
    return <ComingSoonView productKey={route.key} onBack={goHome} />
  }

  // Redis: live if creds present, demo if the user opted in, otherwise setup.
  if (config.upstash) {
    return (
      <RedisDashboard mode="live" creds={config.upstash} openrouter={config.openrouter} onHome={goHome} />
    )
  }
  if (demo) {
    return <RedisDashboard mode="demo" creds={null} openrouter={config.openrouter} onHome={goHome} />
  }

  const missing = [
    process.env.UPSTASH_EMAIL?.trim() ? null : "UPSTASH_EMAIL",
    process.env.UPSTASH_API_KEY?.trim() ? null : "UPSTASH_API_KEY",
  ].filter((v): v is string => v !== null)

  return (
    <SetupView
      missing={missing}
      hasOpenRouter={!!config.openrouter}
      onRetry={() => setConfig(loadConfig())}
      onDemo={() => setDemo(true)}
    />
  )
}
