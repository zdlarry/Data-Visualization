window.onload = () => {
	// $('#select_date').modal('show')
	addSelectDate()
	initial('20170223')
}

const addSelectDate = () => {
	getData('../data_gen/dates.json').then(dates => {
		$('#selectpicker').html('')
		for (let date in dates) {
			$('#selectpicker').append('<option>' + dates[date] + '</option>')
		}
		$('#selectpicker').selectpicker('refresh')
	})
}

const initial = date => {
	$.when(
		getData('../data_gen/' + date + '_type_lng_lat.json'),
		getData('../data_gen/' + date + '_time_type.json'),
		getData('../data_gen/' + date + '_time_type_lng_lat.json'),
		getData('../data_gen/' + date + '_type_time_lng_lat.json'),
		getData('../resources/set_ups/map_style.json'),
		getData('../resources/words_freq/' + date + '.json'),
		getData('../data_gen/' + date + '_area_type.json'),
		getData('../data_gen/dates.json'),
		getData('../data_gen/' + date + '_area_time.json')
	).then((a, b, c, d, e, f, g, h, i) => {
		initMaps(a, b, c, d, e, f, g, h, i)
	})
}

const getData = url => {
	return new Promise((resolve, reject) => {
		$.getJSON(url, data => resolve(data))
	})
}

const getType = index => {
	if (index == '0') {
		return '办证发票'
	} else if (index == '1') {
		return '色情服务'
	} else if (index == '2') {
		return '冒充身份'
	} else if (index == '3') {
		return '地产广告'
	} else {
		return '其他'
	}
}

const generate_data = (a, b, c, d, f, g, h, i) => {
	let legendData = []
	   ,global_scatter_data = {}
	   ,time_type_data = {}
	   ,time_legendData = []
	   ,time_scatter_data = {}
	   ,words_freq_data = []
	   ,sankey_data = []
	   ,sankey_links = []
	   ,area_legend = ['朝阳区', '丰台区', '大兴区', '东城区']
	   ,river_data = []

	for (let i in a) {
		// 为每个类别初始化arr对象
		type = getType(i)
		legendData.push(type)
		global_scatter_data[type] = []
		time_type_data[type] = []

		sankey_data.push({
			name: type
		})

		for (let lng_lat in a[i]) {

			lng_lat_sarr = lng_lat.split(',')
			lng_lat_arr = [parseFloat(lng_lat_sarr[0]), parseFloat(lng_lat_sarr[1])]

			global_scatter_data[type].push(lng_lat_arr.concat(parseInt(a[i][lng_lat])))

		}
	}

	for (let time_label in b) {
		time_legendData.push(time_label)
		time_scatter_data[time_label] = {}

		for (let i in a) {
			type = getType(i)
			if (b[time_label][i] == undefined) {
				time_type_data[type].push(0)
				continue
			}
			time_type_data[type].push(b[time_label][i])
		}

		for (let i in c[time_label]) {
			type = getType(i)
			time_scatter_data[time_label][type] = []

			for (let lng_lat in c[time_label][i]) {

				lng_lat_sarr = lng_lat.split(',')
				lng_lat_arr = [parseFloat(lng_lat_sarr[0]), parseFloat(lng_lat_sarr[1])]

				time_scatter_data[time_label][type].push(lng_lat_arr.concat(parseInt(a[i][lng_lat])))

			}
		}
	}

	// 为键'all'补充上所有的数据
	time_scatter_data['all'] = global_scatter_data

	for (let word in f) {
		words_freq_data.push({
			name: word,
			value: f[word]
		})
	}

	sankey_data.push({
		name: 'All Msgs'
	})

	for (let area in g) {
		sankey_data.push({
			name: area
		})
		let num = 0
		for (let i in g[area]) {
			type = getType(i)
			sankey_links.push({
				source: area,
				target: type,
				value: g[area][i]
			})
			num += g[area][i]
		}
		sankey_links.push({
			source: 'All Msgs',
			target: area,
			value: num
		})
	}

	for (let area of area_legend) {
		for (let time_label in b) {
			if (i[area][time_label] == undefined) {
				river_data.push([$('#selectpicker').val() + ' ' + time_label, 0, area])
				continue
			}
			river_data.push([$('#selectpicker').val() + ' ' + time_label, i[area][time_label], area])
		}
	}

	return {
		legend_data: legendData,
		global_scatter_data: global_scatter_data,
		time_type_data: time_type_data,
		time_legendData: time_legendData,
		time_scatter_data: time_scatter_data,
		words_freq_data: words_freq_data,
		sankey_data: sankey_data,
		sankey_links: sankey_links,
		area_legend: area_legend,
		river_data: river_data
	}
}

const get_type_infos = () => {
	return {
		type_labels : ['办证发票', '冒充身份', '色情服务', '地产广告', '其他'],
	    type_color : {
		   				'冒充身份': {'shadow': 'rgba(34, 57, 97, 0.5)', 'color': 'rgb(84, 107, 147)'},
		   				'办证发票': {'shadow': 'rgba(121, 196, 206, 0.5)', 'color': 'rgb(151, 226, 236)'},
		   				'色情服务': {'shadow': 'rgba(25, 100, 150, 0.5)', 'color': 'rgb(20, 178, 202)'},
		   				'地产广告': {'shadow': 'rgba(91, 166, 176, 0.5)', 'color': 'rgb(150, 187, 240)'},
		   				'其他': {'shadow': 'rgba(10, 37, 77, 0.5)', 'color': 'rgb(44, 67, 107)'}
			 		}
	}
}

const generate_map_global_series = () => {
	let series = []
	   ,type_labels = get_type_infos().type_labels
	   ,type_color = get_type_infos().type_color

	for (let type of type_labels) {
		serie = {
			name: type,
			type: 'scatter',
            coordinateSystem: 'bmap',
            // data: datas.global_scatter_data[type],
            // symbolSize: val => val[2] / 3,
            symbol: 'circle',
            itemStyle: {
            	normal: {
            		type: 'radial',
	                shadowBlur: 30,
	                shadowColor: type_color[type].shadow,
	                shadowOffsetY: 8,
	                color: type_color[type].color
	            }
            }
       //      tooltip: {
       //      	// a: 系列， b: 数据名称， c:数据值
		   		// formatter: '{a}<br/>经,纬,短信数目:{c0}'
       //      }
		}
		series.push(serie)
	}

	return series
}

const generate_map_series = datas => {
	let series = []
	   ,type_labels = get_type_infos().type_labels
	   ,type_color = get_type_infos().type_color

	for (let type of type_labels) {
		serie = {
            data: datas[type],
            symbolSize: val => val[2] / 3,
            tooltip: {
            	// a: 系列， b: 数据名称， c:数据值
		   		formatter: '{a}<br/>经,纬,短信数目:{c0}'
            }
		}
		series.push(serie)
	}

	return series
}

const get_map_options = datas => {
	let options = []

	for (let time_label of ['all'].concat(datas.time_legendData)) {
		option = {
			legend: {
		   		type: 'scroll',
		   		orient: 'vertical',
		   		right: 10,
		   		top: 20,
		   		data: datas.legend_data,
		   		selected: datas.time_scatter_data[time_label]
		   	},
		   	series: generate_map_series(datas.time_scatter_data[time_label])
		}

		options.push(option)
	}

	return options
}

const generate_line_series = datas => {
	let series = []
	   ,type_labels = get_type_infos().type_labels
	   ,type_color = get_type_infos().type_color

	for (let type of type_labels) {
		serie = {
			name: type,
			type: 'line',
			stack: 'nums',
			itemStyle: {
            	normal: {
            		type: 'radial',
	                shadowBlur: 30,
	                shadowColor: type_color[type].shadow,
	                shadowOffsetY: 8,
	                color: type_color[type].color
	            }
            },
			lineStyle: {
				color: type_color[type].color,
				shadowOffsetY: 8,
				shadowBlur: 30,
				shadowColor: type_color[type].shadow
			},
			areaStyle: {
				color: type_color[type].color,
				shadowOffsetY: 8,
				shadowBlur: 30,
				shadowColor: type_color[type].shadow
			},
			data: datas.time_type_data[type],
			smooth: true,
			smoothMonotone: 'x',
			markPoint: {
				symbolSize: 40,
                data: [
                    {type: 'max', name: '最大值'},
                    {type: 'min', name: '最小值'}
                ]
            }
		}
		series.push(serie)
	}
	return series
}

const generate_word_series = datas => {
	return {
		type: 'wordCloud',
	    sizeRange: [6, 47],
	    rotationRange: [-90, 90],
	    rotationStep: 45,
	    gridSize: 3,
	    shape: 'circle',
	    drawOutOfBound: true,
	    top: 18,
	    left: 15,
	    right: 15,
	    width: '95%',
	    height: '95%',
	    textStyle: {
	        normal: {
	            color: () => {
	                return 'rgb(' + [
	                    Math.round(Math.random() * 50 + 195),
	                    Math.round(Math.random() * 50 + 195),
	                    Math.round(Math.random() * 50 + 195)
	                ].join(',') + ')'
	            },
	            fontWeight: 'lighter'
	        },
	        emphasis: {
	            shadowBlur: 10,
                shadowColor: '#000'
	        }
	    },
	    data: datas.words_freq_data
	}
}

const generate_pie_series = datas => {
	return {
		type: 'pie',
	    data: datas.words_freq_data.slice(0, 8),
	    roseType: 'radius',
	    itemStyle: {
            emphasis: {
                shadowBlur: 10,
                shadowOffsetX: 0,
                shadowColor: 'rgba(0, 0, 0, 0.5)'
            }
        },
        label: {
        	show: true,
        	position: 'outside'
        },
        labelLine: {
        	show: true,
        	length: 2,
        	length2: 2,
        	smooth: true
        }
	}
}

const generate_sankey_series = datas => {
	return {
		type: 'sankey',
		left: 18,
		top: 45,
		right: 58,
		bottom: 12,
		nodeWidth: 12,
		nodeGap: 5,
		draggable: false,
		foucsNodeAdjacency: false,
		label: {
			color: 'rgb(151, 226, 236)',
			fontSize: 10,
			fontWeight: 'lighter'
		},
		lineStyle: {
			color: 'rgba(149, 178, 190, 0.7)',
			curveness: 0.7
		},
		data: datas.sankey_data,
		links: datas.sankey_links
	}
}

const generate_river_series = datas => {
	return {
		type: 'themeRiver',
		top: 20,
		left: 5,
		right: 5,
		itemStyle: {
			emphasis: {
				shadowBlur: 20,
				shadowColor: 'rgba(0, 0, 0, 0.7)'
			}
		},
		data: datas.river_data
	}
}

const w_resize = charts => {
	for (let chart of charts) {
		chart.resize()
	}
}

const switch_s_r_chart = (datas, sankey_chart, type) => {
	let txt, series, tooltip, legend, singleAxis, dataZoom
	if (type == 'sankey') {
		txt = 'Sankey Chart'
		series = generate_sankey_series(datas)
		tooltip = {
			trigger: 'item'
		}
		legend = null
		singleAxis = null
		dataZoom = null
	} else {
		txt = 'River Chart'
		series = generate_river_series(datas)
		tooltip = {
			trigger: 'axis',
			axisPointer: {
				type: 'line',
				lineStyle: {
					color: 'rgba(151, 226, 236, 0.6)',
					type: 'solid'
				}
			}
		}
		legend = {
			type: 'scroll',
   			bottom: 6,
   			left: 'center',
   			itemGap: 18,
   			textStyle: {
   				color: 'rgba(220, 220, 220, 0.9)',
   				fontSize: 10
   			},
   			data: datas.area_legend
		}
		singleAxis = {
			bottom: 65,
			type: 'time',
			axisLine: {
				lineStyle: {
					width: 0.5,
					color: 'black'
				}
			},
			axisPointer: {
				animation: true,
				label: {
					show: true
				}
			},
			axisLabel: {
				fontSize: 10,
				fontWeight: 'lighter',
				color: 'black'
			},
			splitLine: {
				show: true,
				lineStyle: {
					width: 0.5,
					type: 'dashed',
					color: 'rgba(200, 200, 200, 0.3)'
				}
			}
		}
		dataZoom = {
	    	type: 'inside',
	    	filterMode: 'filter',
	    	start: 40,
	    	end: 50
	    }
	}

	option = {
   		title: {
   			text: txt,
   			subtext: 'Chart, (previous 10000 items): ' + $('#selectpicker').val(),
   			left: 10,
   			top: 5,
   			textStyle: {
   				color: 'rgb(151, 226, 236)',
   				fontSize: 15,
   				fontWeight: 'lighter'
   			}, 
   			subtextStyle: {
   				color: 'rgba(31, 36, 54, 1)',
   				fontSize: 10
   			}
   		},
   		tooltip: tooltip,
   		legend: legend,
   		singleAxis: singleAxis,
   		dataZoom: dataZoom,
	    toolbox: {
	   		show: true,
	        right: 10,
	        top: 10,
	        itemGap: 15,
	        feature: {
	            myToolSankey: {
	            	show: true,
	            	title: '切换到桑基图',
	            	icon: "M640 448l256 0c38.4 0 64-38.4 64-76.8L960 204.8C960 166.4 934.4 128 896 128l-256 0C620.8 128 601.6 140.8 588.8 160c-51.2 12.8-76.8 70.4-128 192C460.8 364.8 448 396.8 435.2 422.4 422.4 396.8 403.2 384 384 384L128 384C89.6 384 64 422.4 64 460.8l0 160C64 665.6 89.6 704 128 704l256 0c38.4 0 64-38.4 64-76.8L448 614.4c0 0 0 0 0 0 19.2 19.2 38.4 44.8 51.2 64 32 38.4 51.2 64 76.8 83.2l0 51.2c0 44.8 25.6 76.8 64 76.8l256 0c38.4 0 64-38.4 64-76.8l0-160C960 614.4 934.4 576 896 576l-256 0c-38.4 0-64 38.4-64 76.8l0 19.2c-6.4-12.8-19.2-19.2-25.6-32C531.2 620.8 512 595.2 499.2 576c32-38.4 57.6-102.4 83.2-172.8C595.2 428.8 614.4 448 640 448zM384 627.2C384 633.6 384 640 377.6 640L134.4 640C128 640 128 633.6 128 627.2L128 460.8C128 454.4 128 448 134.4 448l249.6 0C384 448 384 454.4 384 460.8L384 627.2zM640 652.8c0-6.4 0-12.8 6.4-12.8l249.6 0c0 0 6.4 6.4 6.4 12.8l0 160c0 6.4 0 12.8-6.4 12.8l-249.6 0c0 0-6.4-6.4-6.4-12.8L640 652.8zM646.4 192l249.6 0C896 192 896 198.4 896 204.8l0 160C896 377.6 896 384 889.6 384l-249.6 0C640 384 640 377.6 640 371.2L640 275.2c0 0 0 0 0 0 0 0 0 0 0 0l0-64C640 198.4 640 192 646.4 192z",
	            	onclick: () => {
	            		switch_s_r_chart(datas, sankey_chart, 'sankey')
	            	}
	            },
	            myToolRiver: {
	            	show: true,
	            	title: '切换到河流图',
	            	icon: "M477.05961249 407.59867177c78.65212209 57.49095599 134.27040822-70.97417628 241.66800795-70.97417701 107.39759973 0 182.21074855 72.84684616 212.82889606 86.33006717C964.14096739 436.34414941 1038.95411622 467.05593044 1038.95411622 467.05593044v7.67794508-26.8728085S824.15891676 261.81134593 718.72762044 263.7776486c-107.39759973 3.83897254-163.01588587 161.04958246-241.66800795 80.52479196C323.59434158 190.93080245 162.54475911 386.53113921 162.54475911 386.53113921v15.35589016c11.51691761-5.80527593 166.8548584-103.55862719 314.51485338 5.7116424z m561.8008702 189.88869363s-23.03383596 13.38958748-53.65198272 32.5844509c28.74547764-9.55061494 53.65198273-7.67794508 53.65198272-7.67794507v-44.10136853 19.1948627z m-450.56429794 42.13506584c-74.81314955-99.71965464-170.69383093 80.52479123-395.0396446 11.51691762 174.53280348 226.31211708 320.22649579-126.59246242 395.0396446 5.71164241 88.20273631 161.04958246 289.51471476 105.43129632 329.87074426 30.7117803l5.71164241-11.51691761c-9.55061494 9.55061494-19.19486342 19.19486342-26.87280849 28.74547765-38.38972611 57.58458953-220.50684113 53.74561628-308.70957818-65.16890037z m0 0 M588.29618476 639.62243124c88.20273631 118.91451734 270.41348558 122.75348989 310.67588156 67.13520376 7.67794508-9.55061494 15.35589016-19.19486342 26.87280849-28.74547765 19.19486342-17.22856002 40.26239598-34.55075357 59.45725867-47.94034105 28.74547764-19.19486342 53.65198273-32.58445017 53.65198274-32.5844509v-17.22856002c-15.35589016 3.83897254-99.71965464 26.87280849-136.14307736 57.490956-40.26239598 34.55075357-222.47314453 32.58445017-310.67588085-42.22869865-78.65212209-65.16890108-180.24444588 86.33006717-425.75142636 24.9065051v-199.43930857s161.04958246-44.10136852 314.5148541 28.74547763c78.65212209 36.42342272 134.27040822-44.10136852 241.5743737-46.06767119 107.39759973 0 182.21074855 46.06767119 212.82889606 55.61828613 28.74547764 7.67794508 92.04170885 15.35589016 103.55862718 15.35589016V465.18326057s-74.81314955-28.74547764-107.39759973-44.10136779c-32.58445017-13.38958748-107.39759973-88.20273631-212.82889606-86.33006717-107.39759973 1.87266986-163.01588587 130.43143567-241.66800721 70.9741763-147.56636218-109.3639024-302.90430224-11.51691761-312.54855072-3.83897254v235.86273201c11.51691761 3.83897254 21.06753256 7.67794508 30.71178031 11.51691761 222.47314453 70.97417628 318.35382665-109.3639024 393.16697548-9.64424775z m0 0 M933.42918636 459.37798536c-32.58445017-9.55061494-107.39759973-55.61828614-212.82889606-55.61828613-107.39759973 0-163.01588587 82.49109462-241.57437441 46.06767119-153.46527092-72.84684616-314.6084869-28.74547764-314.60848692-28.74547763v197.47300589c245.41334696 61.32992855 347.09930428-90.16903971 425.75142566-24.90650583 88.20273631 74.81314955 270.41348558 78.65212209 310.67588083 42.22869866 36.42342272-32.58445017 120.78718721-53.65198273 136.14307809-57.49095528h1.96630267V474.73387552h-1.96630267c-11.51691761 0-74.81314955-7.67794508-103.55862719-15.35589015z m0 1e-8 M933.42918636 499.64038063c-32.58445017-3.83897254-107.39759973-24.9065051-212.82889606-24.90650511-105.43129632 0-163.01588587 36.42342272-241.57437441 19.19486342-153.46527092-32.58445017-314.6084869-13.38958748-314.60848692-13.38958749v90.16903971c245.41334696 26.87280849 347.09930428-40.26239598 425.75142566-11.51691834 88.20273631 32.58445017 270.41348558 34.55075357 310.67588083 19.19486341 36.42342272-13.38958748 120.78718721-24.9065051 136.14307809-24.90650509h1.96630267V507.31832642h-1.96630267c-11.51691761-1.87266986-74.81314955-3.83897254-103.55862719-7.6779458z m0 0",
	            	onclick: () => {
	            		switch_s_r_chart(datas, sankey_chart, 'river')
	            	}
	            }
	        },
	        iconStyle: {
	        	color: 'rgb(161, 236, 246)',
	        	borderColor: 'rgb(161, 236, 246)',
	        	borderWidth: 0.5
	        }
	   	},
	    series: series
   	}

   	sankey_chart.clear()
   	sankey_chart.setOption(option, true)

   	return sankey_chart
}

const switch_chart = (datas, words_cloud_chart, type) => {
	let txt, series
	if (type == 'pie') {
		txt = 'Pie Chart'
		series = generate_pie_series(datas)
	} else {
		txt = 'Words Cloud Chart'
		series = generate_word_series(datas)
	}
	option = {
		title: {
   			text: txt,
   			subtext: "Chart of words' frequence",
   			left: 10,
   			top: 5,
   			textStyle: {
   				color: 'rgb(161, 236, 246)',
   				fontSize: 15,
   				fontWeight: 'lighter'
   			},
   			subtextStyle: {
   				color: 'rgb(104, 127, 167)',
   				fontSize: 10
   			}
   		},
   		toolbox: {
	        show: true,
	        right: 10,
	        top: 10,
	        itemGap: 15,
	        feature: {
	            myToolPie: {
	            	show: true,
	            	title: '切换到饼图',
	            	icon: "M466.920452 1023.808036q94.990189 0 179.966257-35.993251t149.987877-100.973068l-329.954134-327.938511V93.998375q-94.990189 0-181.469974 36.505156T136.486409 229.49297t-99.46935 148.484159-36.985065 180.478161 36.985065 180.95807 99.46935 148.484159 148.964069 98.98944 181.469974 36.985065z m63.988003-531.900269H1023.808036q0-99.981254-39.000687-190.972192T879.835031 143.973005t-157.474474-104.972318T530.908455 0v491.907767z m25.979129 64.979817l331.937761 326.946697q63.988002-63.988002 99.46935-148.484159t35.481347-178.462538H556.85559z",
	            	onclick: () => {
	            		switch_chart(datas, words_cloud_chart, 'pie')
	            	}
	            },
	            myToolWordCloud: {
	            	show: true,
	            	title: '切换到词云',
	            	icon: "M1097.142857 658.285714q0 90.857143-64.285714 155.142857t-155.142857 64.285714l-621.714286 0q-105.714286 0-180.857143-75.142857t-75.142857-180.857143q0-75.428571 40.571429-138t106.857143-93.428571q-1.142857-16-1.142857-24.571429 0-121.142857 85.714286-206.857143t206.857143-85.714286q90.285714 0 163.714286 50.285714t107.142857 131.428571q40-35.428571 94.857143-35.428571 60.571429 0 103.428571 42.857143t42.857143 103.428571q0 42.857143-23.428571 78.857143 73.714286 17.142857 121.714286 76.857143t48 136.857143z",
	            	onclick: () => {
	            		switch_chart(datas, words_cloud_chart, 'cloud')
	            	}
	            }
	        },
	        iconStyle: {
	        	color: 'rgb(161, 236, 246)'
	        }
	    },
        tooltip : {
	        trigger: 'item',
	        formatter: "标签 <br/>{b} : {c} ({d}%)"
	    },
	    series: series
	}
	words_cloud_chart.clear()

	words_cloud_chart.setOption(option, true)
	return words_cloud_chart
}

const initMaps = (a, b, c, d, e, f, g, h, i) => {
	let type_lng_lat = a
	   ,time_type = b
	   ,time_type_lng_lat = c
	   ,type_time_lng_lat = d
	   ,map_set_style = e
	   ,words_freq = f
	   ,area_type = g
	   ,area_time = i

	data = generate_data(a, b, c, d, f, g, h, i)

	let map_dom = $('.map_container')[0]
	   ,line_dom = $('.line_chart')[0]
	   ,cloud_dom = $('.words_cloud')[0]
	   ,sankey_dom = $('.sankey_diagram')[0]
	   ,charts = []
	   ,map_chart = echarts.init(map_dom)
	   ,line_chart = echarts.init(line_dom)
	   ,words_cloud_chart = echarts.init(cloud_dom)
	   ,sankey_chart = echarts.init(sankey_dom)
	   ,map_options = {
	   	// 由baseOption 与 options 构成timeline动图
	   		baseOption: {
	   			timeline: {
	   				axisType: 'category',
	   				loop: false,
	   				playInterval: 500,
	   				left: 10,
	   				bottom: 5,
	   				right: 10,
	   				itemSize: 5,
	   				checkpointStyle: {
	   					symbolSize: 12,
	   					color: 'rgb(44, 67, 107)',
	   					borderColor: 'rgb(151, 226, 236)',
	   					borderWidth: 5
	   				},
	   				controlStyle: {
	   					itemSize: 18
	   				},
	   				data: ['all'].concat(data.time_legendData)
	   			},
	   			title: {
			   		text: 'ChinaVis2017-1',
			   		subtext: 'data from chinavis.org-2017: ' + $('#selectpicker').val(),
			   		sublink: 'http://chinavis.org/2017/',
			   		left: 10,
			   		top: 10,
			   		textStyle: {
			   			color: '#000000',
			   			fontWeight: 'lighter'
			   		},
			   		subtextStyle: {
			   			color: 'rgb(100, 100, 100)',
			   			fontWeight: 'lighter'
			   		}
			   	},
			   	tooltip: {
			   		show: 'true',
			   		trigger: 'item'
			   	},
			   	bmap: {
			   		center: [116.46, 39.92],
			   		zoom: 12.5,
			        roam: true,
			        mapStyle: {
			            styleJson: map_set_style
			        }
			   	},
			   	toolbox: {
			   		show: true,
			        left: 10,
			        top: 60,
			        orient: 'vertical',
			        feature: {
			            myToolSelectDate: {
			            	show: true,
			            	title: '选择日期',
			            	icon: "M716.6464 789.25824h35.83488c20.75136 0 37.71904-12.5696 37.71904-27.97568s-16.96768-27.97568-37.71904-27.97568h-35.83488c-20.75648 0-37.72416 12.5696-37.72416 27.97568 0.31744 15.40608 16.96768 27.97568 37.72416 27.97568zM716.6464 622.336h35.83488c20.75136 0 37.71904-12.5696 37.71904-27.97568 0-15.40096-16.96768-27.97568-37.71904-27.97568h-35.83488c-20.75648 0-37.72416 12.57472-37.72416 27.97568 0.31744 15.40608 16.96768 27.97568 37.72416 27.97568zM494.08 622.336h36.15232c20.74624 0 37.71904-12.5696 37.71904-27.97568 0-15.40096-16.9728-27.97568-37.71904-27.97568H494.08c-20.74624 0-37.71904 12.57472-37.71904 27.97568 0 15.40608 16.9728 27.97568 37.71904 27.97568zM271.51872 622.336h35.83488c20.75136 0 37.72928-12.5696 37.72928-27.97568 0-15.40096-16.97792-27.97568-37.72928-27.97568h-35.83488c-20.74624 0-37.72416 12.57472-37.72416 27.97568 0 15.40608 16.6656 27.97568 37.72416 27.97568zM494.08 789.25824h36.15232c20.74624 0 37.71904-12.5696 37.71904-27.97568s-16.9728-27.97568-37.71904-27.97568H494.08c-20.74624 0-37.71904 12.5696-37.71904 27.97568s16.9728 27.97568 37.71904 27.97568zM271.51872 789.25824h35.83488c20.75136 0 37.72928-12.5696 37.72928-27.97568s-16.97792-27.97568-37.72928-27.97568h-35.83488c-20.74624 0-37.72416 12.5696-37.72416 27.97568s16.6656 27.97568 37.72416 27.97568z M793.344 176.58368h-56.26368V97.36704v-2.2016a27.38176 27.38176 0 0 0-27.35104-27.35104c-14.7712 0-27.03872 11.95008-27.35104 27.02848V176.896H344.13568V97.36704v-2.2016a27.37664 27.37664 0 0 0-27.34592-27.35104 27.0336 27.0336 0 0 0-27.0336 27.02848V176.896H230.656C140.11392 176.58368 66.56 240.08704 66.56 359.85408v430.6688c0 86.12864 65.38752 157.17376 148.3776 165.03296l578.4064 0.62464c90.53696 0 164.096-74.1888 164.096-165.6576V342.56384c0-91.47904-73.55904-165.98016-164.096-165.98016z m108.45696 630.28224c0 51.87072-44.94848 93.68064-99.96288 93.68064H222.48448c-55.32672 0-99.97312-42.12736-99.97312-93.68064V455.10656h779.60192l-0.31232 351.75936z m0-480.65024V399.4624H122.51136V326.21568c0-45.89568 40.2432-93.67552 111.2832-93.67552h55.9616V316.16c0.31744 14.45376 12.56448 26.40384 27.34592 26.40384a27.3664 27.3664 0 0 0 27.34592-27.35104V232.54016h338.24256V316.16c0.31744 14.45376 12.57472 26.40384 27.35616 26.40384a27.38176 27.38176 0 0 0 27.35104-27.35104V232.54016h53.12c55.0144 0 116.31104 40.54528 111.2832 93.67552z",
			            	onclick: () => {
			            		$('.select-box').show()
			            	}
			            },
			            restore:{
			                show:true
			            }
			        }
			   	},
			   	series: generate_map_global_series()
	   		},
	   		options: get_map_options(data)
		   	// series: generate_series(data)
	   	}
	   ,line_options = {
	   		title: {
	   			text: 'Line Chart',
	   			subtext: 'Line chart of time and types: ' + $('#selectpicker').val(),
	   			left: 10,
	   			top: 5,
	   			textStyle: {
	   				color: 'rgb(151, 226, 236)',
	   				fontSize: 15,
	   				fontWeight: 'lighter'
	   			},
	   			subtextStyle: {
	   				color: 'rgb(74, 97, 137)',
	   				fontSize: 10
	   			}
	   		},
	   		legend: {
	   			type: 'scroll',
	   			right: 10,
	   			top: 5,
	   			inactiveColor: 'rgba(10, 10, 10, 0.7)',
	   			textStyle: {
	   				color: 'rgba(200, 200, 200, 0.9)',
	   				fontSize: 10
	   			},
	   			data: data.legend_data,
	   			selected: data.time_type_data
	   		},
	   		tooltip : {
		        trigger: 'axis',
		        axisPointer: {
		            type: 'cross',
		            label: {
		                backgroundColor: '#6a7985'
		            }
		        }
		    },
		    grid: {
		    	left: '1%',
		        right: '1.4%',
		        bottom: '7%',
		        containLabel: true
		    },
		    xAxis: {
		    	type : 'category',
            	boundaryGap : false,
            	axisLine: {
            		lineStyle: {
            			color: 'rgba(200, 200, 200, 0.9)',
            			width: 0.5
            		}
            	},
            	splitLine: {
            		lineStyle: {
            			color: 'rgba(150, 150, 150, 0.9)',
            			width: 0.3,
            			type: 'dashed'
            		}
            	},
            	axisLabel: {
            		fontSize: 10
            	},
            	data: data.time_legendData
		    },
		    yAxis: {
		    	type : 'value',
		    	axisLine: {
            		lineStyle: {
            			color: 'rgba(200, 200, 200, 0.9)',
            			width: 0.5
            		}
            	},
            	splitLine: {
            		lineStyle: {
            			color: 'rgba(150, 150, 150, 0.9)',
            			width: 0.3,
            			type: 'dashed'
            		}
            	},
            	axisLabel: {
            		fontSize: 8
            	}
		    },
            toolbox: {
		        show: true,
		        right:10,
		        top: 25,
		        feature: {
		            dataZoom: {
		                yAxisIndex: 'none'
		            },
		            dataView: {readOnly: false},
		            magicType: {type: ['line', 'bar']}
		        }
		    },
		    dataZoom: {
		    	type: 'inside',
		    	xAxisIndex: [0],
		    	filterMode: 'filter',
		    	start: 0,
		    	end: 100
		    },
		    series: generate_line_series(data)
	    }

	sankey_chart = switch_s_r_chart(data, sankey_chart, 'sankey')
	words_cloud_chart = switch_chart(data, words_cloud_chart, 'cloud')
	charts.push(map_chart)
	charts.push(line_chart)
	charts.push(words_cloud_chart)
	charts.push(sankey_chart)
	map_chart.setOption(map_options, true)
	line_chart.setOption(line_options, true)

	// 联动图
	// map_chart.group = 'msg_show_group'
	// line_chart.group = 'msg_show_group'
	// echarts.connect('msg_show_group')

	window.onresize = () => {w_resize(charts)}
} 

var close_select_date = () => {
	$('.select-box').hide()
}

var select_date = () => {
	let date = $('#selectpicker').selectpicker('val')
	date_str = date.split('-').join('')
	initial(date_str)
}