import {
  require_react
} from "./chunk-WNPTCGAH.js";
import {
  __toESM
} from "./chunk-5WRI5ZAA.js";

// node_modules/react-daum-postcode/lib/index.esm.js
var import_react = __toESM(require_react());
var s = function(o2, e2) {
  return s = Object.setPrototypeOf || { __proto__: [] } instanceof Array && function(o3, e3) {
    o3.__proto__ = e3;
  } || function(o3, e3) {
    for (var t2 in e3) e3.hasOwnProperty(t2) && (o3[t2] = e3[t2]);
  }, s(o2, e2);
};
var a = function() {
  return a = Object.assign || function(o2) {
    for (var e2, t2 = 1, r2 = arguments.length; t2 < r2; t2++) for (var n2 in e2 = arguments[t2]) Object.prototype.hasOwnProperty.call(e2, n2) && (o2[n2] = e2[n2]);
    return o2;
  }, a.apply(this, arguments);
};
function i(o2, e2) {
  var t2 = {};
  for (var r2 in o2) Object.prototype.hasOwnProperty.call(o2, r2) && e2.indexOf(r2) < 0 && (t2[r2] = o2[r2]);
  if (null != o2 && "function" == typeof Object.getOwnPropertySymbols) {
    var n2 = 0;
    for (r2 = Object.getOwnPropertySymbols(o2); n2 < r2.length; n2++) e2.indexOf(r2[n2]) < 0 && Object.prototype.propertyIsEnumerable.call(o2, r2[n2]) && (t2[r2[n2]] = o2[r2[n2]]);
  }
  return t2;
}
var p;
var l = "https://t1.kakaocdn.net/mapjsapi/bundle/postcode/prod/postcode.v2.js";
var c = (p = null, function(o2) {
  return void 0 === o2 && (o2 = l), p || (p = new Promise(function(e2, t2) {
    var r2 = document.createElement("script");
    r2.src = o2, r2.onload = function() {
      var o3, r3, n2, s2 = null !== (r3 = null === (o3 = null === window || void 0 === window ? void 0 : window.kakao) || void 0 === o3 ? void 0 : o3.Postcode) && void 0 !== r3 ? r3 : null === (n2 = null === window || void 0 === window ? void 0 : window.daum) || void 0 === n2 ? void 0 : n2.Postcode;
      if (s2) return e2(s2);
      t2(new Error("Script is loaded successfully, but cannot find Postcode module. Check your scriptURL property."));
    }, r2.onerror = function(o3) {
      return t2(o3);
    }, r2.id = "kakao_postcode_script", document.body.appendChild(r2);
  }));
});
var u = import_react.default.createElement("p", null, "현재 Kakao 우편번호 서비스를 이용할 수 없습니다. 잠시 후 다시 시도해주세요.");
var d = { width: "100%", height: 400 };
var f = { scriptUrl: l, errorMessage: u, autoClose: true };
var h = function(t2) {
  function r2() {
    var o2 = null !== t2 && t2.apply(this, arguments) || this;
    return o2.mounted = false, o2.wrap = (0, import_react.createRef)(), o2.state = { hasError: false, completed: false }, o2.initiate = function(e2) {
      if (o2.wrap.current) {
        var t3 = o2.props;
        t3.scriptUrl, t3.className, t3.style;
        var r3 = t3.defaultQuery, n2 = t3.autoClose;
        t3.errorMessage;
        var s2 = t3.onComplete, p2 = t3.onClose, l2 = t3.onResize, c2 = t3.onSearch, u2 = i(t3, ["scriptUrl", "className", "style", "defaultQuery", "autoClose", "errorMessage", "onComplete", "onClose", "onResize", "onSearch"]);
        new e2(a(a({}, u2), { oncomplete: function(e3) {
          s2 && s2(e3), o2.setState({ completed: true });
        }, onsearch: c2, onresize: l2, onclose: p2, width: "100%", height: "100%" })).embed(o2.wrap.current, { q: r3, autoClose: n2 });
      }
    }, o2.onError = function(e2) {
      console.error(e2), o2.setState({ hasError: true });
    }, o2;
  }
  return function(o2, e2) {
    function t3() {
      this.constructor = o2;
    }
    s(o2, e2), o2.prototype = null === e2 ? Object.create(e2) : (t3.prototype = e2.prototype, new t3());
  }(r2, t2), r2.prototype.componentDidMount = function() {
    var o2 = this.initiate, e2 = this.onError, t3 = this.props.scriptUrl;
    t3 && (this.mounted || (c(t3).then(o2).catch(e2), this.mounted = true));
  }, r2.prototype.render = function() {
    var e2 = this.props, t3 = e2.className, r3 = e2.style, n2 = e2.errorMessage, s2 = e2.autoClose, i2 = this.state, p2 = i2.hasError, l2 = i2.completed;
    return true === s2 && true === l2 ? null : import_react.default.createElement("div", { ref: this.wrap, className: t3, style: a(a({}, d), r3) }, p2 && n2);
  }, r2.defaultProps = f, r2;
}(import_react.Component);
function y(o2) {
  return void 0 === o2 && (o2 = l), (0, import_react.useEffect)(function() {
    c(o2);
  }, [o2]), (0, import_react.useCallback)(function(e2) {
    var t2 = a({}, e2), r2 = t2.defaultQuery, n2 = t2.left, s2 = t2.top, p2 = t2.popupKey, l2 = t2.popupTitle, u2 = t2.autoClose, d2 = t2.onComplete, f2 = t2.onResize, h2 = t2.onClose, y2 = t2.onSearch, m2 = t2.onError, v2 = i(t2, ["defaultQuery", "left", "top", "popupKey", "popupTitle", "autoClose", "onComplete", "onResize", "onClose", "onSearch", "onError"]);
    return c(o2).then(function(o3) {
      new o3(a(a({}, v2), { oncomplete: d2, onsearch: y2, onresize: f2, onclose: h2 })).open({ q: r2, left: n2, top: s2, popupTitle: l2, popupKey: p2, autoClose: u2 });
    }).catch(m2);
  }, [o2]);
}
var m = h;
var v = y;
export {
  m as DaumPostcodeEmbed,
  h as KakaoPostcodeEmbed,
  h as default,
  c as loadPostcode,
  v as useDaumPostcodePopup,
  y as useKakaoPostcodePopup
};
//# sourceMappingURL=react-daum-postcode.js.map
