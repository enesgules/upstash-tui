import { useState } from "react"
import { useKeyboard } from "@opentui/react"
import type { ProductKey } from "../products.ts"
import { HomeView } from "./views/HomeView.tsx"
import { RedisDashboard } from "./views/RedisDashboard.tsx"
import { ComingSoonView } from "./views/ComingSoonView.tsx"

type Route = { view: "home" } | { view: "product"; key: ProductKey }

export function App() {
  const [route, setRoute] = useState<Route>({ view: "home" })

  // Esc always returns to the homepage from any product view.
  useKeyboard((key) => {
    if (key.name === "escape") {
      setRoute((prev) => (prev.view === "home" ? prev : { view: "home" }))
    }
  })

  if (route.view === "home") {
    return <HomeView onOpen={(key) => setRoute({ view: "product", key })} />
  }

  if (route.key === "redis") {
    return <RedisDashboard />
  }

  return <ComingSoonView productKey={route.key} />
}
