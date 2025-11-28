import { onMounted, onUnmounted } from 'vue'
import { useAuthStore } from '@/scripts/stores/authStore.ts'

/**
 * Manages WebSocket connection for timeline updates
 */
export function useTimelineWebSocket(authStore: ReturnType<typeof useAuthStore>) {
    let ws: WebSocket | null = null

    onMounted(() => {
        const token = authStore.accessToken!
        ws = new WebSocket('ws://localhost:9475/timeline/ws', ['access_token', token])

        ws.onopen = () => console.log('Connected to websocket for timeline updates!')
        ws.onmessage = () => console.log('New Media')
    })

    onUnmounted(() => {
        if (ws) {
            ws.close()
        }
    })

    return { ws }
}
