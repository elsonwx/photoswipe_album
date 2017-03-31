#!/usr/bin/env python
#-*-coding:utf-8-*-
import requests
import codecs
import json
import os
import sys
import datetime
username = 'instagram'
ins_api = '打码'
record_file = os.path.dirname(os.path.abspath(__file__)) + '/photo_time.txt'
photos_dir = './photos'
min_photos_dir = './min_photos'

def write_time(s):
    with codecs.open(record_file,'w','utf-8') as f:
        f.write(str(s))

def read_time():
    if not os.path.isfile(record_file):
        return 0
    with codecs.open(record_file,'r+','utf-8') as f:
        fcontent = f.read()
        latest_time = 0
        if fcontent != '':
            latest_time = int(fcontent)
        return latest_time 

def download_img(save_path,url):
    r = requests.get(url, stream=True)
    if r.status_code == 200:
        with open(save_path, 'wb') as f:
            for chunk in r.iter_content(1024):
                f.write(chunk)

def format_unixtime(unixtime):
    return datetime.datetime.fromtimestamp(int(unixtime)).strftime('%Y%m%d%H%M%S')

def update_ori_data(ori_data,year,month,link,size,text):
    d_list = list(ori_data.get('list'))
    ori_year = int(d_list[0].get('year'))
    ori_month = int(d_list[0].get('month'))
    if year > ori_year or (year == ori_year and  month > ori_month):
        new_item = {
                "year": year,
                "month": month,
                "arr":{
                    "link":[
                        str(link)
                    ],
                    "size":[
                        str(size)
                    ],
                    "text":[
                        text
                    ]
                }
        }
        d_list.insert(0,new_item)
        ori_data['list'] = d_list
        return ori_data
    else:
        link_arr = list(d_list[0].get('arr').get('link'))
        link_arr.append(link)
        size_arr = list(d_list[0].get('arr').get('size'))
        size_arr.append(size)
        text_arr = list(d_list[0].get('arr').get('text'))
        text_arr.append(text)
        d_list[0]['arr'] = {
                "link":link_arr,
                "size":size_arr,
                "text":text_arr
        }
        ori_data['list'] = d_list
        return ori_data


def main():
    if not os.path.isdir(photos_dir):
        os.mkdir(photos_dir)
    if not os.path.isdir(min_photos_dir):
        os.mkdir(min_photos_dir)
    ori_data = ''
    with codecs.open('./photos_data.json','r', 'utf-8') as f:
        ori_data = json.load(f)
    record_time = read_time()
    ret = requests.get(ins_api)
    ret_dict = json.loads(ret.text)
    if(ret_dict["status"] == 'ok'):
        total_items = list(ret_dict.get('items'))
        items_len = len(total_items)
        for i in range(items_len):
            cur_item = total_items[items_len-i-1]
            cur_time = int(cur_item.get('created_time'))
            if cur_time > record_time:
                format_time = format_unixtime(cur_time)
                img_low = cur_item.get('images').get('low_resolution').get('url')
                download_img('./min_photos/' + format_time +'.jpg', img_low)
                src_type = ''
                if cur_item.get('type') == 'video':
                    video_sta = cur_item.get('videos').get('standard_resolution').get('url')
                    download_img('./photos/' + format_time +'.mp4', video_sta)
                    src_type = '.mp4'
                else: 
                    img_sta = cur_item.get('images').get('standard_resolution').get('url')
                    download_img('./photos/' + format_time +'.jpg', img_sta)
                    src_type = '.jpg'
                cur_text = ''
                cur_caption = cur_item.get('caption')
                if cur_caption is not None:
                    cur_text = cur_caption.get('text')
                i_year = int(format_time[:4])
                i_month = int(format_time[4:6])
                ori_data = update_ori_data(ori_data,i_year,i_month,format_time+src_type, '640x640', cur_text)
                record_time = cur_time
        write_time(record_time)

    with codecs.open('./photos_data.json','w','utf-8') as f:
        f.write(json.dumps(ori_data,ensure_ascii=False))

main()
