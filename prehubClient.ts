import * as mqtt from 'mqtt';
import { MqttClient, IClientOptions } from 'mqtt';

export enum Activity {
    Sense = 0,
    Scan = 1,
    Bind = 2,
    Print = 3,
    Switch = 4,
    PreHub = 5,
    Display = 6
}

export enum DeviceStatus {
    Idle = 0,
    Active = 1
}

export interface Dictionary<T> {
    [Key: string]: T;
}

export interface IDevice {
    id:string;
    name: string;
    activity: Activity;
    status?: DeviceStatus;
    labels?: string[];
    deviceConfig?: Record<string, string>;
    deviceMetadata?: Record<string, string>;
    payloadMetadata?: Record<string, string>;
}

export class PreHubClientBuilder {
    private readonly _options: IClientOptions;

    constructor(){
        this._options = {
            host: 'localhost',
            port: 1883,
            protocolId: 'MQTT',
            protocolVersion: 5,
            connectTimeout: 1000,
            clean: true
        };
        this._options.protocol = 'mqtt';
    }

    host(host:string): PreHubClientBuilder {
        this._options.host = host;
        return this;
    }

    port(port:number): PreHubClientBuilder {
        this._options.port = port;
        return this;
    }

    username(user:string): PreHubClientBuilder {
        this._options.username = user;
        return this;
    }

    password(pass:string): PreHubClientBuilder {
        this._options.password = pass;
        return this;
    }

    build(): IClientOptions {
        return this._options;
    }
}

export class PreHubClient {
    private client: mqtt.MqttClient;
    private topics: string[] = ['registered', 'activate', 'deactivate', 'payloadmetadata', 'devicemetadata', 'config'];
    clientOptions: IClientOptions;
    hubPrefix: string;
    isRegistered: boolean;

    
    constructor(prehubBuilder: PreHubClientBuilder, public device: IDevice) {
        this.hubPrefix = 'prehub';
        this.clientOptions = prehubBuilder.build();
        if (!device.status) device.status = DeviceStatus.Idle;
    }

    connect(): void {
        const prehub = this;
        try {
            prehub.client = mqtt.connect(this.clientOptions.host, this.clientOptions)
        } catch (error) {
            console.error(error);
            throw error;
        }

        prehub.client.on('connect', function() {
            prehub.topics.forEach((topic: string) => {
                prehub.client.subscribe(`prehub/${prehub.device.id}/${topic}`);
            });
        });
        
        prehub.client.on('message', function(topic:string, message:Buffer){
            prehub.onClientMessage(topic, message);
        });
    }

    disconnect(): void {
        const prehub = this;
        prehub.topics.forEach((topic: string) => {
            prehub.client.unsubscribe(`prehub/${prehub.device.id}/${topic}`);
        });
        prehub.client.end();
    }

    register(): void {
        // if (!this.client.connected) return;
        console.log('registering..');
        const prehub = this;
        prehub.client.publish('prehub/register', JSON.stringify(prehub.device));
        let n: number;
        n = <any>setTimeout(function () { 
            if (!prehub.isRegistered) {
                prehub.register();
            }
          }, 3000);
    }

    private onClientMessage(topic: string, message: Buffer) {
        const prehub = this;
        if (topic.indexOf('ping') > -1){
            prehub.client.publish(`${prehub.device.id}/pingack`, prehub.device.id);
        }

        if (topic.indexOf('activate') > -1 && prehub.device.status == DeviceStatus.Idle){
            prehub.device.status = DeviceStatus.Active;
            prehub.isRegistered = true;
            console.log('activated');
        }

        if (topic.indexOf('deactivate') > -1 && prehub.device.status == DeviceStatus.Active){
            prehub.device.status = DeviceStatus.Idle;
            console.log('deactivated');
        }

        if (topic.indexOf('registerack') > -1){
            prehub.isRegistered = true;
        }

        if (topic.indexOf('payloadmetadata') > -1){
            prehub.updateMeta(JSON.parse(message.toString()));
        }

        if (topic.indexOf('devicemetadata') > -1){
            prehub.updateMeta(JSON.parse(message.toString()), false);
        }
    }

    private updateMeta(metadata: Record<string, string>, isPayloadMeta: boolean = true): void {
        for (let key in metadata) {
            let value: string = metadata[key];
            if (isPayloadMeta){
                this.device.payloadMetadata[key] = value;
            } else {
                this.device.deviceMetadata[key] = value;
            }
        }
    }

    private updateDeviceConfig(config: Record<string, string>){
        for (let key in config){
            this.device.deviceConfig[key] = config[key];
        }
    }
}
 
