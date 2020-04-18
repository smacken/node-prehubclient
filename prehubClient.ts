// declare function require(name:string);
import * as mqtt from 'mqtt';
import { MqttClient, IClientOptions } from 'mqtt';

enum Activity {
    Sense = 0,
    Scan = 1,
    Bind = 2,
    Print = 3,
    Switch = 4,
    PreHub = 5
}
enum DeviceStatus {
    Idle = 0,
    Active = 1
}

interface Dictionary<T> {
    [Key: string]: T;
}

interface IDevice {
    id:string;
    name: string;
    activity: Activity;
    status: DeviceStatus;
    deviceConfig : Dictionary<string>;
    deviceMetadata: Dictionary<string>;
    payloadMetadata: Dictionary<string>;
}

export class PreHubClientBuilder {
    private readonly _options: IClientOptions;

    constructor(){
        this._options = {
            host: 'localhost',
            port: 1883
        };
    }

    host(host:string):PreHubClientBuilder {
        this._options.host = host;
        return this;
    }

    port(port:number):PreHubClientBuilder {
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
    client: mqtt.MqttClient;
    clientOptions: IClientOptions;
    hubPrefix: string;
    isRegistered: boolean;
    
    constructor(public prehubBuilder: PreHubClientBuilder, public device: IDevice) {
        this.hubPrefix = 'prehub';
        this.clientOptions = prehubBuilder.build();
        const topics = ['registered', 'activate', 'deactivate', 'payloadmetadata', 'devicemetadata', 'config']
        this.client.on('connect', () => {
            topics.forEach(topic => {
                this.client.subscribe(`prehub/${device.id}/${topic}`);
            });
        });
        this.client.on('message', (topic: string, message: Buffer) => {
            if (topic.indexOf('ping') > -1){
                this.client.publish(`${device.id}/pingack`, device.id);
            }

            if (topic.indexOf('activate') > -1 && device.status == DeviceStatus.Idle){
                device.status = DeviceStatus.Active;
                console.log('activated');
            }

            if (topic.indexOf('deactivate') > -1 && device.status == DeviceStatus.Active){
                device.status = DeviceStatus.Idle;
                console.log('deactivated');
            }

            if (topic.indexOf('registerack') > -1){
                this.isRegistered = true;
            }

            if (topic.indexOf('payloadmetadata')){
                this.updateMeta(JSON.parse(message.toString()));
            }

            if (topic.indexOf('devicemetadata')){
                this.updateMeta(JSON.parse(message.toString()), false);
            }
        })
    }

    connect() {
        try {
            this.client = mqtt.connect(this.clientOptions.host, this.clientOptions)
        } catch (error) {
            console.error(error);
        }
    }
    register() {
        this.client.publish('prehub/register', JSON.stringify(this.device));
        let n: number;
        n = <any>setTimeout(function () { 
            if (!this.isRegistered) {
                this.register();
            }
          }, 3000);
    }

    updateMeta(metadata: Dictionary<string>, isPayloadMeta: boolean = true): void {
        for (let key in metadata) {
            let value = metadata[key];
            if (isPayloadMeta){
                this.device.payloadMetadata[key] = value;
            } else {
                this.device.deviceMetadata[key] = value;
            }
        }
    }

    updateDeviceConfig(config: Dictionary<string>){
        for (let key in config){
            this.device.deviceConfig[key] = config[key];
        }
    }
}
 
