import { afterEach, describe, expect, it, vi } from 'vitest';
import { fetchMapData } from '../mapService';
afterEach(() => { vi.unstubAllGlobals(); vi.restoreAllMocks(); });
describe('map loading regressions', () => {
  it('loads the map, component lookup and RFID data', async () => {
    const data = [[{x:0,y:0,type:'road'}],[{id:'road',label:'Road'}],[{tag_id:'x'}]];
    const mock=vi.fn()
      .mockResolvedValueOnce({ok:true,json:async()=>data[0]})
      .mockResolvedValueOnce({ok:true,json:async()=>data[1]})
      .mockResolvedValueOnce({ok:true,json:async()=>data[2]});
    vi.stubGlobal('fetch',mock);
    const result=await fetchMapData();
    expect(result.mapData).toEqual(data[0]);
    expect(result.componentDefinitions.road).toEqual(data[1][0]);
    expect(result.rfidData).toEqual(data[2]);
    expect(mock).toHaveBeenCalledTimes(3);
  });
  it('throws a useful error when a map response fails', async () => {
    vi.spyOn(console,'error').mockImplementation(()=>{});
    vi.stubGlobal('fetch',vi.fn().mockResolvedValue({ok:false,status:404}));
    await expect(fetchMapData()).rejects.toThrow('Map data laden mislukt');
  });
  it('throws a useful error on network failure', async () => {
    vi.spyOn(console,'error').mockImplementation(()=>{});
    vi.stubGlobal('fetch',vi.fn().mockRejectedValue(Error('offline')));
    await expect(fetchMapData()).rejects.toThrow('Map data laden mislukt');
  });
});
