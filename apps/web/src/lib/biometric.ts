export interface BiometricDevice {
  id: string;
  name: string;
  type: 'heart_rate' | 'hrv' | 'multi';
  connected: boolean;
  battery?: number;
}

export interface BiometricReading {
  heartRate?: number;
  hrv?: number;
  timestamp: Date;
}

export class BiometricService {
  private device: BluetoothDevice | null = null;
  private server: BluetoothRemoteGATTServer | null = null;
  private characteristic: BluetoothRemoteGATTCharacteristic | null = null;
  private onReadingCallback: ((reading: BiometricReading) => void) | null = null;

  async isBluetoothAvailable(): Promise<boolean> {
    if (!navigator.bluetooth) {
      return false;
    }
    try {
      return await navigator.bluetooth.getAvailability();
    } catch {
      return false;
    }
  }

  async connectHeartRateMonitor(): Promise<BiometricDevice> {
    if (!navigator.bluetooth) {
      throw new Error('Web Bluetooth is not supported in this browser');
    }

    try {
      this.device = await navigator.bluetooth.requestDevice({
        filters: [{ services: ['heart_rate'] }],
        optionalServices: ['battery_service'],
      });

      if (!this.device.gatt) {
        throw new Error('GATT not available');
      }

      this.server = await this.device.gatt.connect();

      const heartRateService = await this.server.getPrimaryService('heart_rate');
      this.characteristic = await heartRateService.getCharacteristic('heart_rate_measurement');

      await this.characteristic.startNotifications();
      this.characteristic.addEventListener('characteristicvaluechanged', this.handleHeartRateChange.bind(this));

      this.device.addEventListener('gattserverdisconnected', this.handleDisconnect.bind(this));

      return {
        id: this.device.id,
        name: this.device.name || 'Heart Rate Monitor',
        type: 'heart_rate',
        connected: true,
      };
    } catch (error) {
      console.error('Failed to connect to device:', error);
      throw error;
    }
  }

  private handleHeartRateChange(event: Event) {
    const target = event.target as BluetoothRemoteGATTCharacteristic;
    const value = target.value;
    if (!value) return;

    const flags = value.getUint8(0);
    const rate16Bits = flags & 0x1;
    let heartRate: number;

    if (rate16Bits) {
      heartRate = value.getUint16(1, true);
    } else {
      heartRate = value.getUint8(1);
    }

    const reading: BiometricReading = {
      heartRate,
      timestamp: new Date(),
    };

    if (this.onReadingCallback) {
      this.onReadingCallback(reading);
    }
  }

  private handleDisconnect() {
    console.log('Device disconnected');
    this.device = null;
    this.server = null;
    this.characteristic = null;
  }

  onReading(callback: (reading: BiometricReading) => void) {
    this.onReadingCallback = callback;
  }

  async disconnect() {
    if (this.characteristic) {
      try {
        await this.characteristic.stopNotifications();
      } catch (error) {
        console.error('Error stopping notifications:', error);
      }
    }

    if (this.server && this.server.connected) {
      this.server.disconnect();
    }

    this.device = null;
    this.server = null;
    this.characteristic = null;
    this.onReadingCallback = null;
  }

  isConnected(): boolean {
    return this.server?.connected || false;
  }

  getDevice(): BiometricDevice | null {
    if (!this.device || !this.isConnected()) {
      return null;
    }

    return {
      id: this.device.id,
      name: this.device.name || 'Heart Rate Monitor',
      type: 'heart_rate',
      connected: true,
    };
  }

  async getBatteryLevel(): Promise<number | null> {
    if (!this.server || !this.server.connected) {
      return null;
    }

    try {
      const batteryService = await this.server.getPrimaryService('battery_service');
      const batteryCharacteristic = await batteryService.getCharacteristic('battery_level');
      const value = await batteryCharacteristic.readValue();
      return value.getUint8(0);
    } catch (error) {
      console.error('Could not read battery level:', error);
      return null;
    }
  }

  calculateHRV(rrIntervals: number[]): number {
    if (rrIntervals.length < 2) return 0;

    const differences: number[] = [];
    for (let i = 1; i < rrIntervals.length; i++) {
      differences.push(Math.abs(rrIntervals[i] - rrIntervals[i - 1]));
    }

    const sumSquaredDiff = differences.reduce((sum, diff) => sum + diff * diff, 0);
    const rmssd = Math.sqrt(sumSquaredDiff / differences.length);

    return Math.round(rmssd);
  }
}

export const biometricService = new BiometricService();
