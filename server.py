from wsgiref.simple_server import make_server
from time import time_ns
from subprocess import Popen
from json import dumps
from json import loads
from l3_mod import WV_Function as f

def app(env, start_response):
	if env.get('REQUEST_METHOD') == 'POST':
		return post(env, start_response)
	else:
		data = dumps({'message': '400 Bad Request'})
		start_response('404 Not Found', [('Content-type', 'application/json; charset=utf-8')])
		return [bytes(data, 'utf8')]

def post(env, start_response):
	content_length = env.get('CONTENT_LENGTH', 0)
	body = env.get('wsgi.input').read(int(content_length)).decode('utf8')
	d = loads(body)
	keys = f(loads(d['headers']), d['pssh'], d['cenc'])
	print(keys)
	l = d['dash'].split('=')
	mpd = l[0]
	token = l[1]
	Popen(['sample.bat', d['title'], keys[0], mpd, token, f'{time_ns()}'[:11]])
	start_response('200 OK', [
		('Content-type', 'text/plain; charset=utf-8'),
		('Access-Control-Allow-Origin', env.get('HTTP_ORIGIN'))
	])
	return []

if __name__ == '__main__':
	make_server('localhost', 8000, app).serve_forever()