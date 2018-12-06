import pandas as pd
import requests
from joblib import Parallel, delayed

# 多进程处理pandas.apply，表中的城区定位
global i

i = 0


def get_postion_area(lng, lat):
    # 调用百度API
    url = 'http://api.map.baidu.com/geocoder?location=' + \
        str(lat) + ',' + str(lng) + '&output=json&key=ZUONbpqGBsYGXNIYHicvbAbM'
    r = requests.get(url)
    global i
    i += 1
    print(i)
    return r.json()['result']['addressComponent']['district'].strip()


def apply_func(pds):
    pds['area'] = pds.apply(lambda x: get_postion_area(x.lng, x.lat), axis=1)
    return pds


def parallel_func(data, func):
    results = Parallel(n_jobs=-1)(delayed(func)(group) for name, group in data)
    return pd.concat(results)


path = './data_process/20170227.csv'

data1 = pd.read_csv(path).ix[:10000, :].groupby('type')
data2 = pd.read_csv(path).ix[10000:, :]

data1 = parallel_func(data1, apply_func)

# data1 = pd.read_csv(path).ix[:2000, :]
# data2 = pd.read_csv(path).ix[2000:, :]

# path = './data_process/20170223_.csv'

# data1['area'] = 1
# data2['area'] = 'none'

data2['area'] = 'none'

data = pd.concat([data1, data2])

data.to_csv(path, index=False)
