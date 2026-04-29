export type Locale = 'el' | 'en' | 'de'

export const LOCALES: Locale[] = ['el', 'en', 'de']
export const DEFAULT_LOCALE: Locale = 'el'

export type Dictionary = {
  nav: { home: string; map: string; report: string }

  landing: {
    heroTitle: string
    heroHighlight: string
    heroDesc: string
    ctaPrimary: string
    ctaSecondary: string
    whatToReport: string
    reportTypes: Array<{ icon: string; label: string }>
    howItWorksTitle: string
    howSteps: Array<{ step: string; title: string; desc: string }>
    statsReports: string
    statsCleaned: string
    statsMunicipalities: string
    impactTitle: string
    impactSubtitle: string
    championsTitle: string
    championsSubtitle: string
    needsWorkTitle: string
    needsWorkSubtitle: string
    unresolvedLabel: string
    footerTagline: string
  }

  tracking: {
    pageTitle: string
    notFoundTitle: string
    notFoundDesc: string
    labelCategory: string
    labelMunicipality: string
    labelSubmitted: string
    labelDescription: string
    rejectedMsg: string
    progressTitle: string
    steps: [string, string, string, string]
    shareTitle: string
    whatsappTemplate: string
    categories: Record<string, string>
  }

  copy: { copy: string; copied: string }

  form: {
    pageTitle: string
    pageSubtitle: string
    photoTitle: string
    photoDesc: string
    photoButton: string
    photoLibrary: string
    photoHint: string
    photoRemove: string
    locationTitle: string
    locationDesc: string
    locationFound: string
    locationRetry: string
    locationLoading: string
    locationButton: string
    locationError: string
    locationExifScanning: string
    locationExifNotFound: string
    locationConfirmTitle: string
    locationSearchPlaceholder: string
    categoryTitle: string
    categoryDesc: string
    descLabel: string
    descOptional: string
    descPlaceholder: string
    navNext: string
    navBack: string
    submit: string
    submitting: string
    successTitle: string
    successDesc: string
    successLinkLabel: string
    successMapLink: string
    categories: Array<{ id: string; label: string; icon: string }>
  }

  map: { unknownMunicipality: string; viewReport: string }
}
