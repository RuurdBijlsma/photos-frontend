import type { InjectionKey, Ref } from 'vue'

export interface ViewContext {
    /**
     * The ordered list of media IDs to browse through.
     */
    ids: Ref<string[]>
    /**
     * Function to ensure IDs are loaded.
     */
    fetchIds: () => Promise<void>
    /**
     * The route to navigate back to when closing the viewer.
     */
    parentRoute: string
}

export const ViewContextKey: InjectionKey<ViewContext> = Symbol('ViewContext')
