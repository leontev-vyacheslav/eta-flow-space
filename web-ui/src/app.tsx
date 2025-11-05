import axios from 'axios';
import { useCallback, useEffect, useRef, useState } from 'react';
import './app.css';
import type { DeviceModel } from './models/device-model';

function App() {
  const reconnect = useRef<boolean>(true);
  const reconnectAttemps = useRef<number>(10);
  const ws = useRef<WebSocket | null>(null);
  const textAreaRef = useRef<HTMLTextAreaElement>(null);
  const [devices, setDevices] = useState<DeviceModel[]>([]);

  const getDeviceListAsync = useCallback(async () => {
    const response = await axios.request({
      url: 'http://localhost:1880/api/get-devices',
      method: 'GET'
    });

    return response.data.values as DeviceModel[];
  }, []);

  const connect = useCallback(() => {
    ws.current = new WebSocket('ws://localhost:1880/ws/a7c135e772de0725');

    ws.current.onopen = () => {
      console.log('Connect');
      reconnectAttemps.current = 10;
    };

    ws.current.onclose = () => {
      if (reconnect && reconnectAttemps.current > 0) {
        setTimeout(() => {
          console.log('Try to reconnect...');
          reconnectAttemps.current = - 1;
          if (ws.current) {
            ws.current.close();
            ws.current = null;
          }

          connect();
        }, 5000);
      }
      console.log('Disconnect');
    };

    ws.current.onmessage = (event: MessageEvent) => {
      if (textAreaRef.current) {
        textAreaRef.current.textContent =
          textAreaRef.current.textContent +
          '\n' +
          event.data +
          '\n--------------------------------------------------------------------------------------------------------------------------\n';
      }
    };

  }, []);

  useEffect(() => {
    (async () => {
      const devices = await getDeviceListAsync();
      setDevices(devices);
    })();
    connect();

    return () => {
      ws.current?.close();
    };
  }, [connect, getDeviceListAsync]);

  return (
    <>
      <div style={{ display: 'flex', flexDirection: 'row', gap: 30 }}>
        <div>
          {devices.map(d => {
            return <div style={{ padding: 10 }} > { d.name }</div>
          })}
      </div>
      <div >
        <textarea ref={textAreaRef} style={{ width: '50vw', height: '50vh' }} />
      </div>
    </div >

    </>
  )
}

export default App
