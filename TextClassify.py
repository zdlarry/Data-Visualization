# coding=utf8
'''
    文本分词聚类处理
'''
import json
import os
import codecs
import jieba
import re
import numpy as np
from sklearn import feature_extraction
from sklearn.feature_extraction.text import TfidfTransformer
from sklearn.feature_extraction.text import CountVectorizer
from sklearn.decomposition import PCA
from sklearn.cluster import SpectralClustering, KMeans, MiniBatchKMeans, Birch, DBSCAN
from sklearn import metrics


# 允许并行分词
jieba.enable_parallel(16)


class TextClassify(object):
    """docstring for TextClassify"""

    def __init__(self):
        super(TextClassify, self).__init__()

    def is_number(self, s):
        # 判断是否为数
        try:
            float(s)
            return True
        except ValueError:
            pass

        try:
            import unicodedata
            unicodedata.numeric(s)
            return True
        except (TypeError, ValueError):
            pass

        return False

    def get_stop_words(self):
        # 获取停用词集合
        with open('./resources/stop_words/stop_words.txt', 'r', encoding='utf8') as f:
            file = f.read().split('\n')

        return set(file)

    def rm_char(self, txt):
        # 剔除空格字符
        txt = re.sub(' ', '', txt)
        txt = re.sub('\u3000', '', txt)
        txt = re.sub('\xa0', '', txt)
        return txt

    def rm_tokens(self, word_generator):
        # 分词剔除停用词
        new_word_list = []
        word_list = list(word_generator)
        stop_words_set = self.get_stop_words()

        for word in word_list:
            if word not in stop_words_set and not self.is_number(word):
                new_word_list.append(word)

        return new_word_list

    def convert_txt_2_wordlist(self, txt_list, fname):
        # 文本分词
        word_file_name = './resources/jieba_word/' + fname + '.txt'

        if os.path.exists(word_file_name):
            print(word_file_name + ' :exists! continue')
            return

        txt_list = map(self.rm_char, txt_list)
        txt_word_list = [self.rm_tokens(jieba.cut(part)) for part in txt_list]
        sum_word_list = sum(txt_word_list, [])

        # 写入文件
        with codecs.open(word_file_name, 'w', 'utf8') as fw:
            for word_list in txt_word_list:
                for i, word in enumerate(word_list):
                    if not i == len(word_list) - 1:
                        fw.write(word + ' ')
                    else:
                        fw.write(word + '\r\n')

    def save_word_freq(self, word_times, word_dict, fname):
        # 保存词频率
        word_frequences = {}
        file_name = './resources/words_freq/' + fname + '.json'

        if os.path.exists(file_name):
            print(file_name + ' :exists! continue')
            return

        for key in word_dict.keys():
            word_frequences[key] = 0
            for words in word_times:
                word_frequences[key] += words[word_dict[key]]
            word_frequences[key] = str(word_frequences[key])

        # 排序并提取前50个词, 然而最多只有39个单词，39维度
        sort_word_frequences = dict(sorted(word_frequences.items(), key=lambda x: x[1], reverse=True)[:50])

        with codecs.open(file_name, 'w') as fw:
            json.dump(sort_word_frequences, fw, ensure_ascii=False)

    def get_word_frequneces(self, txt_list, fname):
        # 获取文本分词的tf_idf
        word_file_name = './resources/jieba_word/' + fname + '.txt'
        self.convert_txt_2_wordlist(txt_list, fname)

        txt_word_list = []
        with codecs.open(word_file_name, 'r', 'utf8') as fr:
            for line in fr.readlines():
                txt_word_list.append(line.strip())

        transformer = TfidfTransformer()
        vectorizer = CountVectorizer(min_df=0.1)
        word_times = vectorizer.fit_transform(txt_word_list)
        result = transformer.fit_transform(word_times).toarray()
        feature_word = vectorizer.vocabulary_

        self.save_word_freq(word_times.toarray(), feature_word, fname)

        print('降维前：', np.shape(word_times))
        return result, feature_word

    def pca_process(self, txt_freq_matrix):
        # pca 降维
        if np.shape(txt_freq_matrix)[0] >= np.shape(txt_freq_matrix)[1]:
            components = 'mle'
            solver = 'full'
        else:
            components = np.shape(txt_freq_matrix)[1]
            solver = 'auto'

        pca = PCA(n_components=components, svd_solver=solver)
        X = pca.fit_transform(txt_freq_matrix)

        print('降维后：', np.shape(X))
        return X

    def clustering(self, txt_freq_matrix, k, jobs, iters, init_seed, batch_size=100):
        # 聚类
        print('clustering...')
        sample_nums = np.shape(txt_freq_matrix)[0]
        if sample_nums < 10000:
            print('using K-Means')
            k_clf = KMeans(n_clusters=k, n_jobs=jobs, max_iter=iters, n_init=init_seed)
            k_clf.fit(txt_freq_matrix)
            y_pred = k_clf.labels_
        else:
            # Mini - Batch - Means 采样聚类
            print('using Mini-Batch-Means')
            mk_clf = MiniBatchKMeans(n_clusters=k, max_iter=iters, n_init=init_seed, batch_size=batch_size)
            mk_clf.fit(txt_freq_matrix)
            y_pred = mk_clf.labels_

            # Birch聚类
            # b_clf = Birch(n_clusters=k)
            # b_clf.fit(txt_freq_matrix)
            # y_pred = b_clf.labels_

            # DBSCAN密度聚类
            # d_clf = DBSCAN(eps=1, min_samples=5, n_jobs=jobs)
            # d_clf.fit(txt_freq_matrix)
            # y_pred = d_clf.labels_

        print('clustering finished, length: ' + str(len(y_pred)))
        return y_pred


if __name__ == '__main__':
    textClassify = TextClassify()
    fname = '20170224'
    tf_idf, word = textClassify.get_word_frequneces([], fname)
    # X = textClassify.pca_process(tf_idf)
    # y_pred = textClassify.clustering(tf_idf, 3, 8, 20, 5)
    # print(y_pred)
