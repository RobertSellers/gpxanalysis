var L = L || require("leaflet"),
	_MAX_POINT_INTERVAL_MS = 15e3,
	_SECOND_IN_MILLIS = 1e3,
	_MINUTE_IN_MILLIS = 60 * _SECOND_IN_MILLIS,
	_HOUR_IN_MILLIS = 60 * _MINUTE_IN_MILLIS,
	_DAY_IN_MILLIS = 24 * _HOUR_IN_MILLIS,
	_DEFAULT_MARKER_OPTS = {
		startIconUrl: "leaflet/pin-icon-start.png",
		endIconUrl: "leaflet/pin-icon-end.png",
		shadowUrl: "leaflet/pin-shadow.png",
		wptIconUrls: {
			"": "leaflet/pin-icon-wpt.png"
		},
		iconSize: [33, 50],
		shadowSize: [50, 50],
		iconAnchor: [16, 45],
		shadowAnchor: [16, 47],
		clickable: !1
	},
	_DEFAULT_POLYLINE_OPTS = {
		color: "blue"
	},
	_DEFAULT_GPX_OPTS = {
		parseElements: ["track", "route", "waypoint"]
	};
L.GPX = L.FeatureGroup.extend({
	initialize: function(t, e) {
		e.max_point_interval = e.max_point_interval || _MAX_POINT_INTERVAL_MS, e.marker_options = this._merge_objs(_DEFAULT_MARKER_OPTS, e.marker_options || {}), e.polyline_options = this._merge_objs(_DEFAULT_POLYLINE_OPTS, e.polyline_options || {}), e.gpx_options = this._merge_objs(_DEFAULT_GPX_OPTS, e.gpx_options || {}), L.Util.setOptions(this, e), L.GPXTrackIcon = L.Icon.extend({
			options: e.marker_options
		}), this._gpx = t, this._layers = {}, this._info = {
			name: null,
			length: 0,
			elevation: {
				gain: 0,
				loss: 0,
				max: 0,
				min: 1 / 0,
				_points: []
			},
			hr: {
				avg: 0,
				_total: 0,
				_points: []
			},
			duration: {
				start: null,
				end: null,
				moving: 0,
				total: 0
			}
		}, t && this._parse(t, e, this.options.async)
	},
	get_duration_string: function(t, e) {
		var n = "";
		t >= _DAY_IN_MILLIS && (n += Math.floor(t / _DAY_IN_MILLIS) + "d ", t %= _DAY_IN_MILLIS), t >= _HOUR_IN_MILLIS && (n += Math.floor(t / _HOUR_IN_MILLIS) + ":", t %= _HOUR_IN_MILLIS);
		var i = Math.floor(t / _MINUTE_IN_MILLIS);
		t %= _MINUTE_IN_MILLIS, i < 10 && (n += "0"), n += i + "'";
		var o = Math.floor(t / _SECOND_IN_MILLIS);
		return t %= _SECOND_IN_MILLIS, o < 10 && (n += "0"), n += o, n += !e && t > 0 ? "." + Math.round(1e3 * Math.floor(t)) / 1e3 : '"'
	},
	to_miles: function(t) {
		return t / 1.60934
	},
	to_ft: function(t) {
		return 3.28084 * t
	},
	m_to_km: function(t) {
		return t / 1e3
	},
	m_to_mi: function(t) {
		return t / 1609.34
	},
	get_name: function() {
		return this._info.name
	},
	get_desc: function() {
		return this._info.desc
	},
	get_author: function() {
		return this._info.author
	},
	get_copyright: function() {
		return this._info.copyright
	},
	get_distance: function() {
		return this._info.length
	},
	get_distance_imp: function() {
		return this.to_miles(this.m_to_km(this.get_distance()))
	},
	get_start_time: function() {
		return this._info.duration.start
	},
	get_end_time: function() {
		return this._info.duration.end
	},
	get_moving_time: function() {
		return this._info.duration.moving
	},
	get_total_time: function() {
		return this._info.duration.total
	},
	get_moving_pace: function() {
		return this.get_moving_time() / this.m_to_km(this.get_distance())
	},
	get_moving_pace_imp: function() {
		return this.get_moving_time() / this.get_distance_imp()
	},
	get_moving_speed: function() {
		return this.m_to_km(this.get_distance()) / (this.get_moving_time() / 36e5)
	},
	get_moving_speed_imp: function() {
		return this.to_miles(this.m_to_km(this.get_distance())) / (this.get_moving_time() / 36e5)
	},
	get_total_speed: function() {
		return this.m_to_km(this.get_distance()) / (this.get_total_time() / 36e5)
	},
	get_total_speed_imp: function() {
		return this.to_miles(this.m_to_km(this.get_distance())) / (this.get_total_time() / 36e5)
	},
	get_elevation_gain: function() {
		return this._info.elevation.gain
	},
	get_elevation_loss: function() {
		return this._info.elevation.loss
	},
	get_elevation_gain_imp: function() {
		return this.to_ft(this.get_elevation_gain())
	},
	get_elevation_loss_imp: function() {
		return this.to_ft(this.get_elevation_loss())
	},
	get_elevation_data: function() {
		var t = this;
		return this._info.elevation._points.map(function(e) {
			return t._prepare_data_point(e, t.m_to_km, null, function(t, e) {
				return t.toFixed(2) + " km, " + e.toFixed(0) + " m"
			})
		})
	},
	get_elevation_data_imp: function() {
		var t = this;
		return this._info.elevation._points.map(function(e) {
			return t._prepare_data_point(e, t.m_to_mi, t.to_ft, function(t, e) {
				return t.toFixed(2) + " mi, " + e.toFixed(0) + " ft"
			})
		})
	},
	get_elevation_max: function() {
		return this._info.elevation.max
	},
	get_elevation_min: function() {
		return this._info.elevation.min
	},
	get_elevation_max_imp: function() {
		return this.to_ft(this.get_elevation_max())
	},
	get_elevation_min_imp: function() {
		return this.to_ft(this.get_elevation_min())
	},
	get_average_hr: function() {
		return this._info.hr.avg
	},
	get_heartrate_data: function() {
		var t = this;
		return this._info.hr._points.map(function(e) {
			return t._prepare_data_point(e, t.m_to_km, null, function(t, e) {
				return t.toFixed(2) + " km, " + e.toFixed(0) + " bpm"
			})
		})
	},
	get_heartrate_data_imp: function() {
		var t = this;
		return this._info.hr._points.map(function(e) {
			return t._prepare_data_point(e, t.m_to_mi, null, function(t, e) {
				return t.toFixed(2) + " mi, " + e.toFixed(0) + " bpm"
			})
		})
	},
	reload: function() {
		this.clearLayers(), this._parse(this._gpx, this.options, this.options.async)
	},
	_merge_objs: function(t, e) {
		var n = {};
		for (var i in t) n[i] = t[i];
		for (var i in e) n[i] = e[i];
		return n
	},
	_prepare_data_point: function(t, e, n, i) {
		var o = [e && e(t[0]) || t[0], n && n(t[1]) || t[1]];
		return o.push(i && i(o[0], o[1]) || o[0] + ": " + o[1]), o
	},
	_load_xml: function(t, e, n, i) {
		void 0 == i && (i = this.options.async), void 0 == n && (n = this.options);
		var o = new window.XMLHttpRequest;
		o.open("GET", t, i);
		try {
			o.overrideMimeType("text/xml")
		} catch (t) {}
		o.onreadystatechange = function() {
			4 == o.readyState && 200 == o.status && e(o.responseXML, n)
		}, o.send(null)
	},
	_parse: function(t, e, n) {
		var i = this,
			o = function(t, e) {
				var n = i._parse_gpx_data(t, e);
				n && (i.addLayer(n), i.fire("loaded"))
			};
		if ("<" === t.substr(0, 1)) {
			var r = new DOMParser;
			n ? setTimeout(function() {
				o(r.parseFromString(t, "text/xml"), e)
			}) : o(r.parseFromString(t, "text/xml"), e)
		} else this._load_xml(t, o, e, n)
	},
	_parse_gpx_data: function(t, e) {
		var n, i, o, r = [],
			a = [],
			_ = e.gpx_options.parseElements;
		_.indexOf("route") > -1 && a.push(["rte", "rtept"]), _.indexOf("track") > -1 && a.push(["trkseg", "trkpt"]);
		var s = t.getElementsByTagName("name");
		s.length > 0 && (this._info.name = s[0].textContent);
		var l = t.getElementsByTagName("desc");
		l.length > 0 && (this._info.desc = l[0].textContent);
		var h = t.getElementsByTagName("author");
		h.length > 0 && (this._info.author = h[0].textContent);
		var m = t.getElementsByTagName("copyright");
		for (m.length > 0 && (this._info.copyright = m[0].textContent), n = 0; n < a.length; n++)
			for (o = t.getElementsByTagName(a[n][0]), i = 0; i < o.length; i++) {
				var p = this._parse_trkseg(o[i], t, e, a[n][1]);
				if (0 !== p.length) {
					var u = new L.Polyline(p, e.polyline_options);
					if (this.fire("addline", {
							line: u
						}), r.push(u), e.marker_options.startIcon || e.marker_options.startIconUrl) {
						var g = new L.Marker(p[0], {
							clickable: e.marker_options.clickable,
							icon: e.marker_options.startIcon || new L.GPXTrackIcon({
								iconUrl: e.marker_options.startIconUrl
							})
						});
						this.fire("addpoint", {
							point: g,
							point_type: "start"
						}), r.push(g)
					}(e.marker_options.endIcon || e.marker_options.endIconUrl) && (g = new L.Marker(p[p.length - 1], {
						clickable: e.marker_options.clickable,
						icon: e.marker_options.endIcon || new L.GPXTrackIcon({
							iconUrl: e.marker_options.endIconUrl
						})
					}), this.fire("addpoint", {
						point: g,
						point_type: "end"
					}), r.push(g))
				}
			}
		if (this._info.hr.avg = Math.round(this._info.hr._total / this._info.hr._points.length), _.indexOf("waypoint") > -1)
			for (o = t.getElementsByTagName("wpt"), i = 0; i < o.length; i++) {
				var c = new L.LatLng(o[i].getAttribute("lat"), o[i].getAttribute("lon")),
					f = o[i].getElementsByTagName("name"),
					s = "";
				f.length > 0 && (s = f[0].textContent);
				var d = o[i].getElementsByTagName("desc"),
					l = "";
				d.length > 0 && (l = d[0].textContent);
				var v = o[i].getElementsByTagName("sym"),
					I = "";
				v.length > 0 && (I = v[0].textContent);
				var M;
				if (e.marker_options.wptIcons && e.marker_options.wptIcons[I]) M = e.marker_options.wptIcons[I];
				else {
					if (!e.marker_options.wptIconUrls || !e.marker_options.wptIconUrls[I]) {
						console.log('No icon or icon URL configured for symbol type "' + I + '"; ignoring waypoint.');
						continue
					}
					M = new L.GPXTrackIcon({
						iconUrl: e.marker_options.wptIconUrls[I]
					})
				}
				var x = new L.Marker(c, {
					clickable: !0,
					title: s,
					icon: M
				});
				x.bindPopup("<b>" + s + "</b>" + (l.length > 0 ? "<br>" + l : "")).openPopup(), this.fire("addpoint", {
					point: x,
					point_type: "waypoint"
				}), r.push(x)
			}
		return r.length > 1 ? new L.FeatureGroup(r) : 1 == r.length ? r[0] : void 0
	},
	_parse_trkseg: function(t, e, n, i) {
		var o = t.getElementsByTagName(i);
		if (!o.length) return [];
		for (var r = [], a = null, _ = 0; _ < o.length; _++) {
			var s, l = new L.LatLng(o[_].getAttribute("lat"), o[_].getAttribute("lon"));
			if (l.meta = {
					time: null,
					ele: null,
					hr: null
				}, s = o[_].getElementsByTagName("time"), s.length > 0 && (l.meta.time = new Date(Date.parse(s[0].textContent))), s = o[_].getElementsByTagName("ele"), s.length > 0 && (l.meta.ele = parseFloat(s[0].textContent)), s = o[_].getElementsByTagNameNS("*", "hr"), s.length > 0 && (l.meta.hr = parseInt(s[0].textContent), this._info.hr._points.push([this._info.length, l.meta.hr]), this._info.hr._total += l.meta.hr), l.meta.ele > this._info.elevation.max && (this._info.elevation.max = l.meta.ele), l.meta.ele < this._info.elevation.min && (this._info.elevation.min = l.meta.ele), this._info.elevation._points.push([this._info.length, l.meta.ele]), this._info.duration.end = l.meta.time, null != a) {
				this._info.length += this._dist3d(a, l);
				var h = l.meta.ele - a.meta.ele;
				h > 0 ? this._info.elevation.gain += h : this._info.elevation.loss += Math.abs(h), h = Math.abs(l.meta.time - a.meta.time), this._info.duration.total += h, h < n.max_point_interval && (this._info.duration.moving += h)
			} else this._info.duration.start = l.meta.time;
			a = l, r.push(l)
		}
		return r
	},
	_dist2d: function(t, e) {
		var n = 6371e3,
			i = this._deg2rad(e.lat - t.lat),
			o = this._deg2rad(e.lng - t.lng),
			r = Math.sin(i / 2) * Math.sin(i / 2) + Math.cos(this._deg2rad(t.lat)) * Math.cos(this._deg2rad(e.lat)) * Math.sin(o / 2) * Math.sin(o / 2),
			a = 2 * Math.atan2(Math.sqrt(r), Math.sqrt(1 - r)),
			_ = n * a;
		return _
	},
	_dist3d: function(t, e) {
		var n = this._dist2d(t, e),
			i = Math.abs(e.meta.ele - t.meta.ele);
		return Math.sqrt(Math.pow(n, 2) + Math.pow(i, 2))
	},
	_deg2rad: function(t) {
		return t * Math.PI / 180
	}
}), "object" == typeof module && "object" == typeof module.exports ? module.exports = L : "function" == typeof define && define.amd && define(L);
//# sourceMappingURL=gpx.min.js.map