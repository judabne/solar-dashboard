import type { InjectionKey, Ref } from 'vue'

export const overviewScrollPaneKey: InjectionKey<Ref<HTMLElement | null>> = Symbol('overviewScrollPane')
export const chartsScrollPaneKey: InjectionKey<Ref<HTMLElement | null>> = Symbol('chartsScrollPane')
