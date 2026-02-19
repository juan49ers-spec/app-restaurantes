declare module 'driver.js' {
    export interface Popover {
        title?: string;
        description?: string;
        side?: "top" | "right" | "bottom" | "left" | "over";
        align?: "start" | "center" | "end";
        showButtons?: string[];
        showProgress?: boolean;
        disableButtons?: string[];
        popoverClass?: string;
        onNextClick?: (element: Element, step: DriveStep, options: { config: Config; state: State }) => void;
        onPrevClick?: (element: Element, step: DriveStep, options: { config: Config; state: State }) => void;
        onCloseClick?: (element: Element, step: DriveStep, options: { config: Config; state: State }) => void;
        [key: string]: any;
    }

    export interface DriveStep {
        element?: string | Element;
        popover?: Popover;
        onDeselected?: (element: Element, step: DriveStep, options: { config: Config; state: State }) => void;
        onHighlightStarted?: (element: Element, step: DriveStep, options: { config: Config; state: State }) => void;
        onHighlighted?: (element: Element, step: DriveStep, options: { config: Config; state: State }) => void;
        [key: string]: any;
    }

    export interface Config {
        animate?: boolean;
        allowClose?: boolean;
        overlayClickBehavior?: "close" | "nextStep" | ((element: Element, step: DriveStep) => void);
        [key: string]: any;
    }

    export interface State {
        isInitialized: boolean;
        activeIndex?: number;
        activeStep?: DriveStep;
        activeElement?: Element;
        [key: string]: any;
    }

    export interface Driver {
        drive: (stepIndex?: number) => void;
        destroy: () => void;
        highlight: (step: DriveStep) => void;
        moveNext: () => void;
        movePrevious: () => void;
        hasNextStep: () => boolean;
        hasPreviousStep: () => boolean;
        getActiveIndex: () => number | undefined;
        isLastStep: () => boolean;
        isFirstStep: () => boolean;
        [key: string]: any;
    }

    export function driver(options?: Config & { steps?: DriveStep[] }): Driver;
}
