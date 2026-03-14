import type { EmergencyModel } from "../models/flows/emergency-model";
import type { MutedReasonModel } from "../models/flows/muted-reason-model";
import type { MutedDeviceModel } from "../models/flows/muted-device-model";

class EmergencyMuteManager {
    private readonly storageKey = 'emergencyDeviceMuted';

    private getDevices(): MutedDeviceModel[] {
        const data = localStorage.getItem(this.storageKey);
        return data ? JSON.parse(data) : [];
    }

    private saveDevices(devices: MutedDeviceModel[]): void {
        localStorage.setItem(this.storageKey, JSON.stringify(devices));
    }

        private playAlertSound(): void {
        const ctx = new AudioContext();

        const beep = (startTime: number, frequency: number, duration: number) => {
            const oscillator = ctx.createOscillator();
            const gainNode = ctx.createGain();

            oscillator.connect(gainNode);
            gainNode.connect(ctx.destination);

            oscillator.type = 'sine';
            oscillator.frequency.setValueAtTime(frequency, startTime);

            // Fade in/out to avoid clicks
            gainNode.gain.setValueAtTime(0, startTime);
            gainNode.gain.linearRampToValueAtTime(0.4, startTime + 0.01);
            gainNode.gain.linearRampToValueAtTime(0, startTime + duration);

            oscillator.start(startTime);
            oscillator.stop(startTime + duration);
        };

        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const siren = (durationMs: number = 2500) => {

            const ctx = new AudioContext();

            const oscillator = ctx.createOscillator();
            const gainNode = ctx.createGain();

            oscillator.connect(gainNode);
            gainNode.connect(ctx.destination);

            oscillator.type = 'sawtooth';

            // Fade out at the end
            gainNode.gain.setValueAtTime(0.3, ctx.currentTime);
            gainNode.gain.setValueAtTime(0.3, ctx.currentTime + durationMs / 1000 - 0.3);
            gainNode.gain.linearRampToValueAtTime(0, ctx.currentTime + durationMs / 1000);

            const sweepDuration = 0.8;
            const cycles = Math.ceil((durationMs / 1000) / sweepDuration);

            for (let i = 0; i < cycles; i++) {
                const t = ctx.currentTime + i * sweepDuration;
                oscillator.frequency.setValueAtTime(440, t);
                oscillator.frequency.linearRampToValueAtTime(880, t + sweepDuration / 2);
                oscillator.frequency.linearRampToValueAtTime(440, t + sweepDuration);
            }

            oscillator.start(ctx.currentTime);
            oscillator.stop(ctx.currentTime + durationMs / 1000);

            oscillator.onended = () => {
                ctx?.close();
            };
        }

        const wave =() => {
            const frequencies = [800, 1200, 2000, 1200, 800];
            const interval = 0.1;

            frequencies.forEach((freq, index) => {
                beep(ctx.currentTime + index * interval, freq, interval);
            });
        };

        wave();
    }

    addMute(deviceId: number, reason: number, duration: number): void {
        const devices = this.getDevices();
        let device = devices.find(d => d.id === deviceId);

        if (!device) {
            device = { id: deviceId, muteReasonItems: [] };
            devices.push(device);
        }

        const entry: MutedReasonModel = { id: reason, time: Date.now() + duration, duration: duration };
        const existingIndex = device.muteReasonItems.findIndex(m => m.id === reason);

        if (existingIndex !== -1) {
            device.muteReasonItems[existingIndex] = entry;
        } else {
            device.muteReasonItems.push(entry);
        }

        this.saveDevices(devices);
    }

    removeMute(deviceId: number, reason: number): void {
        const devices = this.getDevices();
        const device = devices.find(d => d.id === deviceId);

        if (!device) return;

        device.muteReasonItems = device.muteReasonItems.filter(m => m.id !== reason);

        const updated = device.muteReasonItems.length > 0
            ? devices
            : devices.filter(d => d.id !== deviceId);

        this.saveDevices(updated);
    }

    purgeExpiredMutes(): void {
        const now = Date.now();
        const devices = this.getDevices()
            .map(d => ({ ...d, muteReasonItems: d.muteReasonItems.filter(m => m.time > now) }))
            .filter(d => d.muteReasonItems.length > 0);

        this.saveDevices(devices);
    }

    getDevice(deviceId: number): MutedDeviceModel | undefined {
        return this.getDevices().find(d => d.id === deviceId);
    }

    isDeviceMuted(deviceId: number, reason: number): boolean {
        const device = this.getDevice(deviceId);
        if (!device) return false;

        const now = Date.now();
        return device.muteReasonItems.some(m => m.id === reason && m.time > now)
    }

    getReason(deviceId: number, reason: number): MutedReasonModel | undefined {
        const device = this.getDevice(deviceId);
        if (!device) return undefined;

        const now = Date.now();
        return device.muteReasonItems.find(m => m.id === reason && m.time > now);
    }

    getAll(): MutedDeviceModel[] {
        return this.getDevices();
    }

    clear(): void {
        localStorage.removeItem(this.storageKey);
    }

    getUnmutedEmergencies(emergencyStates: EmergencyModel[]): EmergencyModel[] {
        const now = Date.now();
        const mutedDevices = this.getDevices();

        return emergencyStates
            .map(emergencyState => {
                const mutedDevice = mutedDevices.find(d => d.id === emergencyState.deviceId);

                const unmutedReasons = emergencyState.reasons.filter((reason: any) => {
                    if (!mutedDevice) {
                        return true;
                    };

                    const muteEntry = mutedDevice.muteReasonItems.find(m => m.id === reason.id);
                    return !muteEntry || muteEntry.time <= now; // not muted, or mute expired
                });

                return unmutedReasons.length > 0
                    ? { ...emergencyState, reasons: unmutedReasons }
                    : null;
            })
            .filter(e => e !== null);
    }

    hasUnmutedEmergencies(emergencyState: EmergencyModel[]): boolean {
        return this.getUnmutedEmergencies(emergencyState).length > 0;
    }

    processEmergencyStates(emergencyStates: EmergencyModel[]): void {
        const hasUnmuted = this.hasUnmutedEmergencies(emergencyStates);
        if (hasUnmuted) {
            this.playAlertSound();
        }
        this.purgeExpiredMutes();
    }
}

export const emergencyMuteManager = new EmergencyMuteManager();