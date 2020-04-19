# Mqtt Prehub Client
> Mqtt Prehub javascript/node client

Connect to a mqtt broker with a prehub operating for device provisioning.

```typescript
    const builder = new PreHubClientBuilder().host('localhost').port(1833);
    const device: IDevice = {
        id: Guid.newGuid(),
        name: 'Barcode scanner #1',
        activity: Activity.Scan
    }; 
    const prehub = new PreHubClient(builder, device);
    prehub.connect();
    prehub.register();
```

## Installation

```shell
    npm install node-prehubclient
```

## Setup

1. Connect to Mqtt Broker with the Prehub operating.
    ```typescript
        const builder = new PreHubClientBuilder().host('localhost').port(1833);
    ```
2. Configure the device the client is running as.
    ```typescript
        const device: IDevice = {
            id: Guid.newGuid(),
            name: 'Barcode scanner #1',
            activity: Activity.Scan
        };
    ```
3. Connect to the Mqtt broker through the Prehub client.
4. Register the device with the Prehub for provisioning.
Once registered, the device will be configured from the prehub. This will include activation/deactivation,
any configuration of the device/payload,  Device metadata etc.