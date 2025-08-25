import type { WidgetConfig } from "@medusajs/admin"
import FurgonetkaWidget from "./furgonetka-widget"

export const config: WidgetConfig = {
  zone: "order.details.after"
}

export default FurgonetkaWidget
