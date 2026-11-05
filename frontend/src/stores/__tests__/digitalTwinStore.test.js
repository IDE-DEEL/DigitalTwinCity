import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest';
import { createPinia, setActivePinia } from 'pinia';
import { markRaw } from 'vue';
import { useDigitalTwinStore } from '../digital-twin';

const { errorToast } = vi.hoisted(() => ({ errorToast: vi.fn() }));
vi.mock('vue-toastification', () => ({ useToast: () => ({ error: errorToast }) }));

class MockSocket {
  static OPEN = 1;
  constructor(url) { this.url = url; this.readyState = 0; this.send = vi.fn(); MockSocket.last = this; return markRaw(this); }
  emit(type, payload) { this.onmessage?.({ data: JSON.stringify({ type, payload }) }); }
  open() { this.readyState = 1; this.onopen?.(); }
  close() { this.readyState = 3; this.onclose?.(); }
}
let store;
beforeEach(() => {
  vi.stubGlobal('WebSocket', MockSocket);
  setActivePinia(createPinia());
  errorToast.mockClear();
  store = useDigitalTwinStore();
  vi.spyOn(console, 'log').mockImplementation(() => {});
  vi.spyOn(console, 'warn').mockImplementation(() => {});
  vi.spyOn(console, 'error').mockImplementation(() => {});
});
afterEach(() => { vi.restoreAllMocks(); vi.unstubAllGlobals(); });

describe('Digital Twin telemetry and connection regressions', () => {
  it('starts disconnected with five cars', () => { expect(store.connectionStatus).toBe('disconnected'); expect(store.car_data).toHaveLength(5); });
  it('connects and marks socket open', () => { store.connect(); expect(store.connectionStatus).toBe('connecting'); MockSocket.last.open(); expect(store.connectionStatus).toBe('connected'); });
  it('does not create duplicate connections', () => { store.connect(); const socket = store.socket; store.connect(); expect(store.socket).toBe(socket); });
  it('reports constructor failure', () => { vi.stubGlobal('WebSocket', class { constructor() { throw Error('offline'); } }); store.connect(); expect(store.connectionStatus).toBe('disconnected'); expect(errorToast).toHaveBeenCalledOnce(); });
  it('reports socket error only once when followed by close', () => { store.connect(); const s=MockSocket.last; s.onerror(); s.onclose(); expect(errorToast).toHaveBeenCalledOnce(); expect(store.socket).toBeNull(); });
  it('reports unexpected close', () => { store.connect(); MockSocket.last.onclose(); expect(store.connectionStatus).toBe('disconnected'); expect(errorToast).toHaveBeenCalledOnce(); });
  it('ignores malformed JSON', () => { store.connect(); MockSocket.last.onmessage({data:'{broken'}); expect(store.speed).toBe(50); });
  it.each([null, [], {}, {type:7}])('ignores invalid message envelope %j', (value) => { store.connect(); MockSocket.last.onmessage({data:JSON.stringify(value)}); expect(store.speed).toBe(50); });
  it('updates speed only for finite numbers', () => { store.connect(); MockSocket.last.emit('speed', 30); expect(store.speed).toBe(30); for(const v of ['fast',null,Infinity]) MockSocket.last.emit('speed',v); expect(store.speed).toBe(30); });
  it('updates scenario only for strings', () => { store.connect(); MockSocket.last.emit('scenario','Druk'); MockSocket.last.emit('scenario',5); expect(store.chosen_scenario).toBe('Druk'); });
  it('updates activation only for booleans', () => { store.connect(); MockSocket.last.emit('activation',true); MockSocket.last.emit('activation','false'); expect(store.active).toBe(true); });
  it('updates existing car RFID tag', () => { store.connect(); MockSocket.last.emit('car_data',[{auto_id:'auto_A',tag_id:'new'}]); expect(store.car_data[0].tag_id).toBe('new'); });
  it('adds valid new car', () => { store.connect(); MockSocket.last.emit('car_data',[{auto_id:'auto_Z',tag_id:'Z'}]); expect(store.car_data).toHaveLength(6); });
  it('rejects malformed car entries without losing valid entries', () => { store.connect(); MockSocket.last.emit('car_data',[null,{}, {auto_id:'',tag_id:'x'},{auto_id:'auto_Z',tag_id:'Z'}]); expect(store.car_data).toHaveLength(6); expect(store.car_data.at(-1).auto_id).toBe('auto_Z'); });
  it('ignores non-array car data', () => { store.connect(); MockSocket.last.emit('car_data',{auto_id:'auto_Z',tag_id:'Z'}); expect(store.car_data).toHaveLength(5); });
  it('accepts an empty car data array', () => { store.connect(); MockSocket.last.emit('car_data',[]); expect(store.car_data).toHaveLength(5); });
  it('updates package count for a known car', () => { store.updatePackages({car_id:'auto_A',packages:3}); expect(store.findCar('auto_A').pakketje).toBe(3); });
  it('rejects invalid package count', () => { store.updatePackages({car_id:'auto_A',packages:'3'}); expect(store.findCar('auto_A').pakketje).toBe(0); });
  it('updates route for a known car', () => { store.updateRoute({car_id:'auto_A',route:'route_2'}); expect(store.findCar('auto_A').route).toBe('route_2'); });
  it('rejects invalid route', () => { store.updateRoute({car_id:'auto_A',route:3}); expect(store.findCar('auto_A').route).toBe('route_1'); });
  it('updates car status', () => { store.updateStatus({car_id:'auto_A',status:false}); expect(store.findCar('auto_A').status).toBe(false); });
  it('rejects invalid car status', () => { store.updateStatus({car_id:'auto_A',status:'false'}); expect(store.findCar('auto_A').status).toBe(true); });
  it('updates energy', () => { store.updateEnergy({car_id:'auto_A',energy:42}); expect(store.findCar('auto_A').energie).toBe(42); });
  it('rejects invalid energy', () => { store.updateEnergy({car_id:'auto_A',energy:'42'}); expect(store.findCar('auto_A').energie).toBe(100); });
  it('ignores updates for unknown cars', () => { store.updateEnergy({car_id:'missing',energy:42}); expect(store.findCar('missing')).toBeUndefined(); });
  it('handles telemetry messages through the socket', () => { store.connect(); MockSocket.last.emit('car_packages',{car_id:'auto_A',packages:4}); MockSocket.last.emit('car_status',{car_id:'auto_A',status:false}); MockSocket.last.emit('car_energy',{car_id:'auto_A',energy:80}); MockSocket.last.emit('route',{car_id:'auto_A',route:'route_3'}); expect(store.findCar('auto_A')).toMatchObject({pakketje:4,status:false,energie:80,route:'route_3'}); });
  it('updates results only with an object', () => { store.connect(); MockSocket.last.emit('results',{total:12}); MockSocket.last.emit('results',[]); expect(store.results).toEqual({total:12}); });
  it('updates scenario house remaining packages', () => { store.scenario_houses=[{Scenario:'Rustig',tags:[{tag_id:'X',undeliverd_packages:2}]}]; store.connect(); MockSocket.last.emit('houses',[{tag_id:'X',remaining:7}]); expect(store.scenario_houses[0].tags[0].undeliverd_packages).toBe(7); });
  it('does not send when disconnected', () => { expect(store.sendData('speed',10)).toBe(false); expect(errorToast).toHaveBeenCalledOnce(); });
  it('sends JSON when connected', () => { store.connect(); MockSocket.last.open(); expect(store.sendData('speed',10)).toBe(true); expect(MockSocket.last.send).toHaveBeenCalledWith(JSON.stringify({type:'speed',payload:10})); });
  it('reports send exceptions', () => { store.connect(); MockSocket.last.open(); MockSocket.last.send.mockImplementation(() => {throw Error('send failed')}); expect(store.sendData('speed',10)).toBe(false); expect(errorToast).toHaveBeenCalledOnce(); });
});

describe('Digital Twin data fetching', () => {
  it.each([
    ['fetchTagPositions','/data/test-map4-tags.json','tag_positions'],
    ['fetchDepotRoutes','/data/depot-routes.json','car_depot_routes'],
    ['fetchRoutes','/data/routes.json','routes'],
    ['fetchHouses','/data/houses.json','houses'],
    ['fetchHousesPerScenario','/data/scenarios.json','scenario_houses'],
  ])('%s loads valid data', async (method,url,key) => {
    const data = method === 'fetchHousesPerScenario' ? [{Scenario:'Rustig',tags:[]}] : [{id:1}];
    const fetchMock=vi.fn().mockResolvedValue({ok:true,json:async()=>data}); vi.stubGlobal('fetch',fetchMock);
    await store[method](); expect(fetchMock).toHaveBeenCalledWith(url); expect(store[key]).toEqual(data);
  });
  it.each(['fetchTagPositions','fetchDepotRoutes','fetchRoutes','fetchHouses','fetchHousesPerScenario'])('%s reports HTTP failure', async (method) => {
    vi.stubGlobal('fetch',vi.fn().mockResolvedValue({ok:false,status:500}));
    await store[method](); expect(errorToast).toHaveBeenCalledOnce();
  });
  it('rejects invalid scenario data', async () => { vi.stubGlobal('fetch',vi.fn().mockResolvedValue({ok:true,json:async()=>[{Scenario:'Rustig',tags:null}]})); await store.fetchHousesPerScenario(); expect(store.scenario_houses).toEqual([]); expect(errorToast).toHaveBeenCalledOnce(); });
});
