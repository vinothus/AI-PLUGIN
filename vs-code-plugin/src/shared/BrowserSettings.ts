export interface BrowserSettings {
    enabled: boolean;
    useLocalChrome: boolean;
    customArguments: string[];
    headless: boolean;
    viewport: {
        width: number;
        height: number;
    };
    timeout: number;
    screenshotPath: string;
}
