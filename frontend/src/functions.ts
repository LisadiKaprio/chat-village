import { WidgetName } from "../../common/src/Types"
import router from "./router"

export async function verifyWidgetId(currentWidgetName: WidgetName, channel: string, id: string) {
    try {
        const resp = await fetch(`/api/verify-widget-id/${currentWidgetName}/${channel}/${id}`)
        if (resp.status !== 200) {
          router.push('/')
        }
      } catch (error: unknown) {
        if (
          error instanceof TypeError &&
          error.message.startsWith('NetworkError')
        ) {
          // TODO: a disconnect icon or loading message.
        } else {
          throw error
        }
      }
}