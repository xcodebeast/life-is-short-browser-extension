export type ElementBlockerRule = {
  selector: string;
};

export type ElementBlockerConfiguration = {
  styleElementId: string;
  rules: readonly ElementBlockerRule[];
  matchesUrl?: (url: string) => boolean;
};

export type ElementBlocker = {
  setEnabled: (enabled: boolean) => void;
  refresh: () => void;
  destroy: () => void;
};

const BLOCKED_ELEMENT_DECLARATION = 'display: none !important;';

function buildStyleSheet(rules: readonly ElementBlockerRule[]): string {
  return rules
    .map((rule) => `${rule.selector} { ${BLOCKED_ELEMENT_DECLARATION} }`)
    .join('\n');
}

function getStyleElement(styleElementId: string): HTMLStyleElement | null {
  const element = document.getElementById(styleElementId);
  if (!element) {
    return null;
  }

  return element instanceof HTMLStyleElement ? element : null;
}

function getStyleParent(): HTMLElement {
  return document.head ?? document.documentElement;
}

export function createElementBlocker(
  configuration: ElementBlockerConfiguration,
): ElementBlocker {
  const styleSheet = buildStyleSheet(configuration.rules);
  let enabled = false;

  const refresh = () => {
    if (!enabled) {
      return;
    }

    const styleParent = getStyleParent();
    const existingStyleElement = getStyleElement(configuration.styleElementId);
    const styleElement =
      existingStyleElement ?? document.createElement('style');

    if (!existingStyleElement) {
      styleElement.id = configuration.styleElementId;
      styleElement.setAttribute('data-life-is-short-element-blocker', '');
      styleParent.prepend(styleElement);
    }

    if (styleElement.textContent !== styleSheet) {
      styleElement.textContent = styleSheet;
    }
  };

  const destroy = () => {
    getStyleElement(configuration.styleElementId)?.remove();
  };

  return {
    setEnabled(nextEnabled: boolean) {
      enabled = nextEnabled;

      if (enabled) {
        refresh();
        return;
      }

      destroy();
    },
    refresh,
    destroy,
  };
}
