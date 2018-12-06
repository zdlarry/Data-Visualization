import pandas as pd
import os
import codecs

base_path = './data_seg_content'


def push_jieba_words(seg_content, fw):
    if not isinstance(seg_content, float):
        seg_content_list = seg_content.split(' ')
        for i, word in enumerate(seg_content_list):
            if not i == len(seg_content_list) - 1 and not word == '':
                fw.write(word + ' ')
            elif i == len(seg_content_list) - 1 and word == '':
                fw.write('\r\n')
            elif i == len(seg_content_list) - 1 and not word == '':
                fw.write(word + '\r\n')


if __name__ == '__main__':

    for fname in os.listdir(base_path):
        if fname[-3:] == 'csv':
            full_path = os.path.join(base_path, fname)
            data = pd.read_csv(full_path)
            name = fname.split('.')[0]
            path = './resources/jieba_word/' + name + '.txt'

            with codecs.open(path, 'w', 'utf8') as fw:
                data['seg_content'].apply(lambda x: push_jieba_words(x, fw))
