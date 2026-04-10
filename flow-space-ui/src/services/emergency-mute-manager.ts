import type { EmergencyModel } from "../models/flows/emergency-model";
import type { MutedReasonModel } from "../models/flows/muted-reason-model";
import type { MutedDeviceModel } from "../models/flows/muted-device-model";

class EmergencyMuteManager {
    oneHour =  3600000;
    oneYear = 31536000000;

    private readonly storageKey = 'emergencyDeviceMuted';
    private audioUnlocked = false;

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

        const wave = () => {
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

    private purgeExpiredMutes(emergencyStates: EmergencyModel[]): void {
        const now = Date.now();
        const devices = this.getDevices()
            .map(d => ({ ...d, muteReasonItems: d.muteReasonItems.filter(m => m.time > now && emergencyStates.find(e => e.deviceId === d.id)?.reasons.map(r => r.id).includes(m.id)) }))
            .filter(d => d.muteReasonItems.length > 0);

        this.saveDevices(devices);
    }

    getDevice(deviceId: number): MutedDeviceModel | undefined {
        return this.getDevices().find(d => d.id === deviceId);
    }

    isDeviceMuted(emergencyState: EmergencyModel): boolean {
        const device = this.getDevice(emergencyState.deviceId);
        if (!device) return false;
        const now = Date.now();
        const a = emergencyState.reasons.map(r => r.id)
        const b = device.muteReasonItems.filter(m => m.time > now).map(m => m.id)

        const setA = new Set(a);
        const setB = new Set(b);

        const symDiff = [
            ...a.filter(x => !setB.has(x)),
            ...b.filter(x => !setA.has(x)),
        ];

        return symDiff.length === 0 && b.length > 0;
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
        this.purgeExpiredMutes(emergencyStates);
    }

    unlockAudio(): void {
        if (this.audioUnlocked) return;
        const ctx = new AudioContext();
        ctx.resume().then(() => {
            this.audioUnlocked = true;
            ctx.close();
        });
    }
}

export const emergencyMuteManager = new EmergencyMuteManager();