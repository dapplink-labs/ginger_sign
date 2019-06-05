import { FormattedSettings } from '../common/types/objects';
import { RippleAPI } from '..';
export declare type SettingsOptions = {
    ledgerVersion?: number;
};
export declare function parseAccountFlags(value: number, options?: {
    excludeFalse?: boolean;
}): {};
export declare function getSettings(this: RippleAPI, address: string, options?: SettingsOptions): Promise<FormattedSettings>;
//# sourceMappingURL=settings.d.ts.map