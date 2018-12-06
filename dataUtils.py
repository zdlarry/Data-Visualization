# coding=utf8
import pandas as pd
import numpy as np
import datetime as dt
import json
import os
import codecs
from TextClassify import TextClassify

# base_dir = './data'
# csv_first = os.path.join(base_dir, '20170223.csv')
# pds = pd.read_csv(csv_first)

# msgs = list(pds['cont ent'].str.strip())[:10]
# print(pds.conntime)
# def getTime(conntime):
#     return pd.Timestamp(conntime, unit='ms').time()


# def judgeConnTime(conntime, time_stamp):
#     if getTime(conntime) > time_stamp:
#         return time_stamp

# pds['start_time'] = pds.apply(lambda x: judgeConnTime(x.conntime, time_stamp), axis=1)
# print(pds)
# data_csv = {}
# for fname in os.listdir(base_dir):
#     data_csv[fname.split('.')[0]] = pd.read_csv(os.path.join(base_dir, fname))

# print(data.ix[0:3, :])

# s = dt.datetime(2018, 11, 27, 00, 00, 00)
# t = dt.time(0, 2, 0)
# u = dt.timedelta(0, 150)

# s = pd.date_range('00:00:00', '23:59:59', freq='150S').time.tolist()
# for i in np.arange(len(s)):
#     print(i)
# time_stamp = pd.Timestamp(1487779323000, unit='ms').time()
# print(s[0] > time_stamp)
# print(pd.Timestamp(1487779323000, unit='ms').time())


class DataUtils(object):
    """docstring for DataUtils"""

    def __init__(self):
        super(DataUtils, self).__init__()
        self.base_dir = './data'
        self.process_csv_dir = './data_process'
        self.data_gen_dir = './data_gen'
        self.textClassify = TextClassify()
        self.load_data()

        self.data_group_by_lng_lat_time_type()
        self.data_group_by_lng_lat_type()
        self.data_group_by_type_time()
        self.data_group_by_area_type()
        self.data_group_by_area_time()

        self.gen_lng_lat_time_type_json()
        self.gen_lng_lat_type_json()
        self.gen_time_type_json()
        self.gen_area_type_json()
        self.gen_area_time_json()

        self.gen_date_json()

    def load_data(self):
        # 将数据加载到字典中
        self.data_csv = {}
        for fname in os.listdir(self.base_dir):
            if fname[-3:] == 'csv':
                name = fname.split('.')[0]
                if os.path.exists(os.path.join(self.process_csv_dir, fname)):
                    data = pd.read_csv(os.path.join(self.process_csv_dir, fname))
                else:
                    data = self.pre_deal_data(pd.read_csv(os.path.join(self.base_dir, fname)), name)
                self.data_csv[name] = data

        print('load data finished')

    def getTime(self, recitime):
        time = pd.Timestamp(recitime, unit='ms', tz='Asia/Shanghai').time()
        return time.hour, time.minute, time.second

    def judgeConnTime(self, recitime, time_stamps):
        for time_stamp in time_stamps:
            h, m, s = self.getTime(recitime)
            second = h * 3600 + m * 60 + s
            index = second // 150
            return time_stamps[index]

    def deal_msg(self, data, fname):
        def deal_Nan(x):
            return 4.0 if x != x else x

        # 处理每个短信的类型
        msgs_list = list(data['content'].str.strip())

        sample_nums = np.shape(msgs_list)[0]
        tf_idf, word = self.textClassify.get_word_frequneces(msgs_list, fname)
        X = self.textClassify.pca_process(tf_idf)
        # 分成4类别
        y_pred = self.textClassify.clustering(X, 4, 16, 2000, 40, sample_nums // 2)
        # 更新type列
        data['type'] = pd.Series(y_pred)
        # 补上其他类别
        data['type'] = data['type'].apply(lambda x: deal_Nan(x))
        print(data['type'])
        return data

    def pre_deal_data(self, data, key):
        '''
         将加载好的列进行预处理：
         (1) 添加发送时间所属的时间段
         (2) 添加文本的类型
        '''
        # 获取时间序列
        print('pre deal data: ' + str(key) + ' started...')

        time_stamps = self.create_timestamps('150s')

        # 添加所属的时间段
        data['start_time'] = data['recitime'].apply(lambda x: self.judgeConnTime(x, time_stamps))
        # 判断类型
        # data = self.deal_msg(data, key)
        data.to_csv(os.path.join(self.process_csv_dir, key + '.csv'), index=False)

        print('data processing finished')
        return data

    def create_timestamps(self, time_freq):
        # 按照time_freq间隔生成时间戳序列
        time_stamps = pd.date_range('00:00:00', '23:59:59', freq=time_freq).time.tolist()
        return time_stamps

    def data_group_by_lng_lat_time_type(self):
        # 由基站的位置,发送时间段,msg类型进行文本聚类
        for key in self.data_csv.keys():

            path = os.path.join(self.data_gen_dir, key + '_lng_lat_time_type.csv')
            if os.path.exists(path):
                os.remove(path)

            pds = self.data_csv[key].groupby(
                ['lng', 'lat', 'start_time', 'type']).size().reset_index(drop=False)
            pds.columns = ['lng', 'lat', 's_time', 'type', 'num']

            pds.to_csv(path, index=False)
        # print(self.data_msg_nums_by_station_time_type['20170223'])

    def data_group_by_lng_lat_type(self):
        # 根据基站的地理位置, 短信类型聚类
        for key in self.data_csv.keys():

            path = os.path.join(self.data_gen_dir, key + '_lng_lat_type.csv')
            if os.path.exists(path):
                os.remove(path)

            pds = self.data_csv[key].groupby(
                ['lng', 'lat', 'type']).size().reset_index(drop=False)
            pds.columns = ['lng', 'lat', 'type', 'num']
            pds = pds.sort_values(by='num', kind='mergesort')

            pds.to_csv(path, index=False)
        # print(self.data_msg_nums_by_station_type['20170223'])

    def data_group_by_type_time(self):
        # 根据时间，生成类型的个数数据
        '''
            可视化界面的下方折线图：包含时间，类型的数目
        '''
        for key in self.data_csv.keys():

            path = os.path.join(self.data_gen_dir, key + '_time_type.csv')
            if os.path.exists(path):
                os.remove(path)

            pds = self.data_csv[key].groupby(['start_time', 'type']).size().reset_index(drop=False)
            pds.columns = ['s_time', 'type', 'num']

            pds.to_csv(path, index=False)

    def data_group_by_area_type(self):
        # 根据城区，类型聚类构成的数据
        for key in self.data_csv.keys():

            path = os.path.join(self.data_gen_dir, key + '_area_type.csv')
            if os.path.exists(path):
                os.remove(path)

            pds = self.data_csv[key].ix[:10000, :].groupby(['area', 'type']).size().reset_index(drop=False)
            pds.columns = ['area', 'type', 'num']

            pds.to_csv(path, index=False)

    def data_group_by_area_time(self):
        for key in self.data_csv.keys():

            path = os.path.join(self.data_gen_dir, key + '_area_time.csv')
            if os.path.exists(path):
                os.remove(path)

            pds = self.data_csv[key].ix[:10000, :].groupby(['area', 'start_time']).size().reset_index(drop=False)
            pds.columns = ['area', 's_time', 'num']

            pds.to_csv(path)

    def gen_lng_lat_time_type_json(self):
        # 生成基于时间段/类型的 基站，类型/时间，数量json文件
        '''
            时间分类：随着效果的更新
            类型分类：当选择类型时的更新
        '''
        group_time_dict = {}
        group_type_dict = {}
        for key in self.data_csv.keys():
            path = os.path.join(self.data_gen_dir, key + '_lng_lat_time_type.csv')

            data = pd.read_csv(path)
            data_by_time = data.groupby('s_time')

            for m_time, time_group in data_by_time:
                group_time_dict[m_time] = {}

                data_by_time_type = time_group.groupby('type')
                for m_type, time_type_group in data_by_time_type:
                    group_time_dict[m_time][m_type] = {}

                    for lng, lat, num in zip(time_type_group['lng'], time_type_group['lat'], time_type_group['num']):
                        position = str(lng) + ',' + str(lat)
                        group_time_dict[m_time][m_type][position] = num

            data_by_type = data.groupby('type')

            for m_type, type_group in data_by_type:
                group_type_dict[m_type] = {}

                data_by_type_time = type_group.groupby('s_time')
                for m_time, type_time_group in data_by_type_time:
                    group_type_dict[m_type][m_time] = {}

                    for lng, lat, num in zip(type_time_group['lng'], type_time_group['lat'], type_time_group['num']):
                        position = str(lng) + ',' + str(lat)
                        group_type_dict[m_type][m_time][position] = num

            file_name = os.path.join(self.data_gen_dir, key + '_time_type_lng_lat.json')
            with codecs.open(file_name, 'w', 'utf8') as fw:
                json.dump(group_time_dict, fw, ensure_ascii=False)

            file_name = os.path.join(self.data_gen_dir, key + '_type_time_lng_lat.json')
            with codecs.open(file_name, 'w', 'utf8') as fw:
                json.dump(group_type_dict, fw, ensure_ascii=False)

    def gen_lng_lat_type_json(self):
        # 基于类型，生成基站，数目的json
        # 可视化界面初始效果
        group_type_dict = {}
        for key in self.data_csv.keys():
            path = os.path.join(self.data_gen_dir, key + '_lng_lat_type.csv')

            data = pd.read_csv(path)

            data_by_type = data.groupby('type')

            for m_type, type_group in data_by_type:
                group_type_dict[m_type] = {}

                for lng, lat, num in zip(type_group['lng'], type_group['lat'], type_group['num']):
                    position = str(lng) + ',' + str(lat)
                    group_type_dict[m_type][position] = num

            file_name = os.path.join(self.data_gen_dir, key + '_type_lng_lat.json')
            with codecs.open(file_name, 'w', 'utf8') as fw:
                json.dump(group_type_dict, fw, ensure_ascii=False)

    def gen_time_type_json(self):
        group_time_dict = {}
        for key in self.data_csv.keys():
            path = os.path.join(self.data_gen_dir, key + '_time_type.csv')

            data = pd.read_csv(path)

            data_by_time = data.groupby('s_time')

            for m_time, time_group in data_by_time:
                group_time_dict[m_time] = {}

                for m_type, num in zip(time_group['type'], time_group['num']):
                    group_time_dict[m_time][m_type] = num

            file_name = os.path.join(self.data_gen_dir, key + '_time_type.json')
            with codecs.open(file_name, 'w', 'utf8') as fw:
                json.dump(group_time_dict, fw, ensure_ascii=False)

    def gen_area_type_json(self):
        group_area_dict = {}
        for key in self.data_csv.keys():
            path = os.path.join(self.data_gen_dir, key + '_area_type.csv')

            data = pd.read_csv(path)

            data_by_area = data.groupby('area')

            for m_area, area_group in data_by_area:
                group_area_dict[m_area] = {}

                for m_type, num in zip(area_group['type'], area_group['num']):
                    group_area_dict[m_area][m_type] = num

            file_name = os.path.join(self.data_gen_dir, key + '_area_type.json')
            with codecs.open(file_name, 'w', 'utf8') as fw:
                json.dump(group_area_dict, fw, ensure_ascii=False)

    def gen_date_json(self):
        date_dict = {}
        for key in self.data_csv.keys():
            year = key[:4]
            month = key[4:6]
            date = key[6:]
            date_dict[key] = year + '-' + month + '-' + date

        file_name = os.path.join(self.data_gen_dir, 'dates.json')
        with codecs.open(file_name, 'w', 'utf8') as fw:
            json.dump(date_dict, fw, ensure_ascii=False)

    def gen_area_time_json(self):
        area_time_dict = {}
        for key in self.data_csv.keys():
            path = os.path.join(self.data_gen_dir, key + '_area_time.csv')

            data = pd.read_csv(path)

            data_by_area = data.groupby('area')

            for m_area, area_group in data_by_area:
                area_time_dict[m_area] = {}

                for m_time, num in zip(area_group['s_time'], area_group['num']):
                    area_time_dict[m_area][m_time] = num

            file_name = os.path.join(self.data_gen_dir, key + '_area_time.json')
            with codecs.open(file_name, 'w', 'utf8') as fw:
                json.dump(area_time_dict, fw, ensure_ascii=False)


if __name__ == '__main__':
    dataUtils = DataUtils()
