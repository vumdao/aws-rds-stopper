import requests
from datetime import datetime
import json


def send_slack(msg):
    """ Send payload to slack """
    webhook_url = "https://hooks.slack.com/services/***"
    footer_icon = 'https://d1.awsstatic.com/icons/jp/rds_icon_concole.fe14dd124ff0ce7cd8f55f63e0112170c35885f1.png'
    color = '#36C5F0'
    level = ':white_check_mark: INFO :white_check_mark:'
    curr_time = datetime.now().strftime('%Y-%m-%d %H:%M:%S')
    payload = {"username": "Test",
               "attachments": [{
                                "pretext": level,
                                "color": color,
                                "text": f"Test",
                                "footer": f"{curr_time}",
                                "footer_icon": footer_icon}]}
    requests.post(webhook_url, data=json.dumps(payload), headers={'Content-Type': 'application/json'})


def handler(event, context):
    _id = event['rdsClusterId']
    print(_id)
    msg = "Test more"
    send_slack(msg)
    return {"Status": "Ok"}

