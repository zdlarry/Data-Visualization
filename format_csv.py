import pandas as pd
import os

base_path = './data'

for fname in os.listdir(base_path):
    path = os.path.join(base_path, fname)

    data = pd.read_csv(path)

    data = data.reindex(columns=['md5', 'content', 'phone', 'conntime', 'recitime', 'lng', 'lat', 'type'])

    data.to_csv(path, index=False, encoding='utf8')
