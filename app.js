(function () {
  "use strict";
  var T = window.TIENDA || {};
  var P = window.PRODUCTOS || [];
  var porId = {};
  P.forEach(function (p) { porId[p.id] = p; });

  var DEPARTAMENTOS = ["Amazonas","Antioquia","Arauca","Atlántico","Bogotá D.C.","Bolívar","Boyacá","Caldas","Caquetá","Casanare","Cauca","Cesar","Chocó","Córdoba","Cundinamarca","Guainía","Guaviare","Huila","La Guajira","Magdalena","Meta","Nariño","Norte de Santander","Putumayo","Quindío","Risaralda","San Andrés y Providencia","Santander","Sucre","Tolima","Valle del Cauca","Vaupés","Vichada"];

  var $ = function (s) { return document.querySelector(s); };
  var fmt = function (n) { return "$" + Math.round(n).toLocaleString("es-CO"); };
  var esc = function (s) { return String(s).replace(/[&<>"']/g, function (c) { return {"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#39;"}[c]; }); };
  var norm = function (s) { return String(s).toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, ""); };

  // ---------- almacenamiento seguro ----------
  var CLAVE = "ticytu_carrito_v1", CLAVE_DATOS = "ticytu_datos_v1";
  function leer(k, def) { try { var v = localStorage.getItem(k); return v ? JSON.parse(v) : def; } catch (e) { return def; } }
  function guardar(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} }

  var carrito = leer(CLAVE, {});
  Object.keys(carrito).forEach(function (id) { if (!porId[id] || porId[id].agotado) delete carrito[id]; });

  // ---------- textos de configuración ----------
  document.title = (T.nombre || "TICYTU") + " · Ofertas de Navidad";
  ["nombreTienda", "pieNombre"].forEach(function (id) { $("#" + id).textContent = T.nombre || "TICYTU"; });
  if (T.lema) $("#lema").textContent = T.lema;
  $("#notaEnvio").textContent = T.notaEnvio || "";
  var pagos = T.mediosPago || ["Nequi", "Daviplata", "Llave Bre-B"];
  $("#piePagos").textContent = pagos.join(" · ");
  $("#pagos").innerHTML = pagos.map(function (m, i) {
    return '<label><input type="radio" name="pago" value="' + esc(m) + '"' + (i === 0 ? " required" : "") + "> " + esc(m) + "</label>";
  }).join("");
  $("#departamento").insertAdjacentHTML("beforeend", DEPARTAMENTOS.map(function (d) { return "<option>" + d + "</option>"; }).join(""));

  // ---------- cuenta regresiva ----------
  var fin = new Date(T.finTemporada || "2026-12-24T23:59:00-05:00").getTime();
  function tic() {
    var r = Math.max(0, fin - Date.now());
    var d = Math.floor(r / 864e5), h = Math.floor(r / 36e5) % 24, m = Math.floor(r / 6e4) % 60, s = Math.floor(r / 1e3) % 60;
    var pad = function (n) { return (n < 10 ? "0" : "") + n; };
    $("#cd-d").textContent = pad(d); $("#cd-h").textContent = pad(h); $("#cd-m").textContent = pad(m); $("#cd-s").textContent = pad(s);
    if (r <= 0) $("#cuenta").hidden = true;
  }
  tic(); setInterval(tic, 1000);

  // ---------- categorías y filtros ----------
  var cats = [];
  P.forEach(function (p) { if (cats.indexOf(p.cat) < 0) cats.push(p.cat); });
  cats.sort(function (a, b) { return a.localeCompare(b, "es"); });
  var catActual = "Todas", texto = "";
  function pintarChips() {
    $("#chips").innerHTML = ["Todas"].concat(cats).map(function (c) {
      return '<button class="chip" role="tab" aria-selected="' + (c === catActual) + '" data-cat="' + esc(c) + '">' + (c === "Todas" ? "🔥 Todas" : esc(c)) + "</button>";
    }).join("");
  }
  $("#chips").addEventListener("click", function (e) {
    var b = e.target.closest(".chip"); if (!b) return;
    catActual = b.getAttribute("data-cat"); pintarChips(); pintar();
  });
  var tBusq;
  $("#buscar").addEventListener("input", function (e) {
    clearTimeout(tBusq); tBusq = setTimeout(function () { texto = norm(e.target.value.trim()); pintar(); }, 150);
  });

  // ---------- grilla ----------
  function controles(p) {
    if (p.agotado) return '<button class="btn-agregar" disabled>Agotado</button>';
    var c = carrito[p.id] || 0;
    if (!c) return '<button class="btn-agregar" data-acc="mas" data-id="' + p.id + '">🛒 Agregar</button>';
    return '<div class="ctrl-cant"><button data-acc="menos" data-id="' + p.id + '" aria-label="Quitar uno">−</button><span>' + c + '</span><button data-acc="mas" data-id="' + p.id + '" aria-label="Agregar uno">+</button></div>';
  }
  function tarjeta(p) {
    return '<article class="tarjeta' + (p.agotado ? " agotado" : "") + '" data-id="' + p.id + '">' +
      (p.agotado ? '<div class="sello-agotado"><span>AGOTADO</span></div>' : '<span class="etq-oferta">OFERTA</span>') +
      '<button class="foto" data-acc="ver" data-id="' + p.id + '" aria-label="Ver detalle de ' + esc(p.nombre) + '"><img loading="lazy" src="' + esc(p.img) + '" alt="' + esc(p.nombre) + '"></button>' +
      '<div class="info"><span class="cat">' + esc(p.cat) + '</span>' +
      '<h3 class="nombre">' + esc(p.nombre) + '</h3>' +
      '<span class="ref">Ref. ' + esc(p.ref) + (p.marca ? " · " + esc(p.marca) : "") + '</span>' +
      '<div class="precio"><b>' + fmt(p.precio) + '</b>' + (p.agotado ? "" : "<small>PRECIO NAVIDAD</small>") + '</div>' +
      '<div class="zona-ctrl">' + controles(p) + '</div></div></article>';
  }
  function visibles() {
    return P.filter(function (p) {
      if (catActual !== "Todas" && p.cat !== catActual) return false;
      if (texto && norm(p.nombre + " " + p.ref + " " + p.marca + " " + p.cat).indexOf(texto) < 0) return false;
      return true;
    }).sort(function (a, b) { return (a.agotado - b.agotado); });
  }
  var LOTE = 40, listaActual = [], mostrados = 0;
  function pintar() {
    listaActual = visibles();
    mostrados = 0;
    $("#resultado").textContent = listaActual.length + (listaActual.length === 1 ? " producto" : " productos") + (catActual !== "Todas" ? " en " + catActual : "");
    $("#grilla").innerHTML = listaActual.length ? "" : '<div class="sin-resultados">No encontramos productos con esa búsqueda 😕</div>';
    masProductos();
  }
  function masProductos() {
    if (mostrados >= listaActual.length) { $("#verMas").hidden = true; return; }
    var lote = listaActual.slice(mostrados, mostrados + LOTE);
    $("#grilla").insertAdjacentHTML("beforeend", lote.map(tarjeta).join(""));
    mostrados += lote.length;
    $("#verMas").hidden = mostrados >= listaActual.length;
    $("#verMas").textContent = "Ver más productos (" + (listaActual.length - mostrados) + ")";
  }
  $("#verMas").addEventListener("click", masProductos);
  if ("IntersectionObserver" in window) {
    new IntersectionObserver(function (es) { if (es[0].isIntersecting) masProductos(); }, { rootMargin: "600px" }).observe($("#verMas"));
  }
  function refrescarTarjeta(id) {
    document.querySelectorAll('.tarjeta[data-id="' + id + '"] .zona-ctrl, #detalle .zona-ctrl[data-id="' + id + '"]').forEach(function (z) {
      z.innerHTML = controles(porId[id]);
    });
  }

  // ---------- carrito ----------
  function cambiar(id, d) {
    var p = porId[id]; if (!p || p.agotado) return;
    var n = (carrito[id] || 0) + d;
    if (n <= 0) delete carrito[id]; else carrito[id] = Math.min(n, 99);
    guardar(CLAVE, carrito);
    refrescarTarjeta(id); pintarCarrito();
    if (d > 0) { aviso("✅ " + p.nombre + " agregado"); var b = $("#contador"); b.classList.remove("salta"); void b.offsetWidth; b.classList.add("salta"); }
  }
  function lineas() {
    return Object.keys(carrito).map(function (id) { var p = porId[id]; return { p: p, c: carrito[id], sub: p.precio * carrito[id] }; });
  }
  function pintarCarrito() {
    var ls = lineas();
    var cant = ls.reduce(function (a, l) { return a + l.c; }, 0);
    var total = ls.reduce(function (a, l) { return a + l.sub; }, 0);
    $("#contador").textContent = cant;
    $("#barraCant").textContent = cant;
    $("#barraTotal").textContent = fmt(total);
    $("#barraCarrito").hidden = cant === 0 || panelAbierto;
    $("#total").textContent = fmt(total);
    $("#vacio").hidden = cant > 0;
    $("#formulario").hidden = cant === 0;
    $("#panelPie").hidden = cant === 0;
    $("#lista").innerHTML = ls.map(function (l) {
      return '<div class="item"><img src="' + esc(l.p.img) + '" alt="">' +
        '<div><div class="item-nom">' + esc(l.p.nombre) + '</div><div class="item-pre">Ref. ' + esc(l.p.ref) + " · " + fmt(l.p.precio) + " c/u</div>" +
        '<div class="item-ctrl"><button data-acc="menos" data-id="' + l.p.id + '" aria-label="Quitar uno">−</button><b>' + l.c + '</b><button data-acc="mas" data-id="' + l.p.id + '" aria-label="Agregar uno">+</button>' +
        '<button class="quitar" data-acc="quitar" data-id="' + l.p.id + '">Quitar</button></div></div>' +
        '<div class="item-sub">' + fmt(l.sub) + "</div></div>";
    }).join("");
  }

  // ---------- panel ----------
  var panelAbierto = false;
  function abrirPanel() { panelAbierto = true; $("#panel").classList.add("abierto"); $("#panel").setAttribute("aria-hidden", "false"); $("#panelFondo").hidden = false; document.body.style.overflow = "hidden"; pintarCarrito(); }
  function cerrarPanel() { panelAbierto = false; $("#panel").classList.remove("abierto"); $("#panel").setAttribute("aria-hidden", "true"); $("#panelFondo").hidden = true; document.body.style.overflow = ""; pintarCarrito(); }
  $("#abrirCarrito").addEventListener("click", abrirPanel);
  $("#barraCarrito").addEventListener("click", abrirPanel);
  $("#cerrarCarrito").addEventListener("click", cerrarPanel);
  $("#panelFondo").addEventListener("click", cerrarPanel);
  document.addEventListener("keydown", function (e) { if (e.key === "Escape" && panelAbierto) cerrarPanel(); });

  // ---------- detalle ----------
  var modal = $("#modalProducto");
  function verDetalle(id) {
    var p = porId[id];
    $("#detalle").innerHTML = '<div class="det-foto"><img src="' + esc(p.img) + '" alt="' + esc(p.nombre) + '"></div>' +
      '<div class="det-info"><span class="cat">' + esc(p.cat) + '</span><h3>' + esc(p.nombre) + '</h3>' +
      '<span class="ref">Ref. ' + esc(p.ref) + (p.marca ? " · " + esc(p.marca) : "") + '</span>' +
      (p.desc && p.desc.length ? "<ul>" + p.desc.map(function (d) { return "<li>" + esc(d) + "</li>"; }).join("") + "</ul>" : "") +
      '<div class="precio"><b>' + fmt(p.precio) + '</b>' + (p.agotado ? "" : "<small>PRECIO NAVIDAD</small>") + "</div>" +
      '<div class="zona-ctrl" data-id="' + p.id + '">' + controles(p) + "</div></div>";
    if (modal.showModal) modal.showModal(); else modal.setAttribute("open", "");
  }
  modal.addEventListener("click", function (e) { if (e.target === modal || e.target.closest("[data-cerrar]")) modal.close(); });

  // ---------- acciones delegadas ----------
  document.addEventListener("click", function (e) {
    var b = e.target.closest("[data-acc]");
    if (b) {
      var id = b.getAttribute("data-id"), a = b.getAttribute("data-acc");
      if (a === "mas") cambiar(id, 1);
      else if (a === "menos") cambiar(id, -1);
      else if (a === "quitar") cambiar(id, -(carrito[id] || 0));
      else if (a === "ver") verDetalle(id);
      return;
    }
    if (e.target.closest("[data-cerrar-panel]")) cerrarPanel();
  });

  // ---------- formulario ----------
  var form = $("#formulario");
  var datos = leer(CLAVE_DATOS, {});
  Object.keys(datos).forEach(function (k) {
    var el = form.elements[k];
    if (!el) return;
    if (el instanceof RadioNodeList) { Array.prototype.forEach.call(el, function (r) { r.checked = r.value === datos[k]; }); }
    else el.value = datos[k];
  });
  form.addEventListener("input", function (e) {
    e.target.classList.remove("invalido");
    var d = {}; ["nombre","telefono","direccion","barrio","ciudad","departamento","pago"].forEach(function (k) { d[k] = form.elements[k].value; });
    guardar(CLAVE_DATOS, d);
  });

  function validar() {
    var err = "", primero = null;
    form.querySelectorAll(".invalido").forEach(function (el) { el.classList.remove("invalido"); });
    ["nombre","telefono","direccion","barrio","ciudad","departamento"].forEach(function (k) {
      var el = form.elements[k];
      if (!el.value.trim()) { el.classList.add("invalido"); primero = primero || el; err = "Completa los campos marcados en rojo."; }
    });
    var tel = form.elements.telefono.value.replace(/\D/g, "").replace(/^57(?=3\d{9}$)/, "");
    if (form.elements.telefono.value.trim() && !/^3\d{9}$/.test(tel)) {
      form.elements.telefono.classList.add("invalido"); primero = primero || form.elements.telefono;
      err = err || "El celular debe tener 10 dígitos y empezar por 3.";
    }
    if (!err && !form.elements.pago.value) err = "Elige un medio de pago.";
    if (form.elements.nombre.value.trim() && form.elements.nombre.value.trim().split(/\s+/).length < 2 && !err) {
      form.elements.nombre.classList.add("invalido"); primero = form.elements.nombre; err = "Escribe tu nombre y apellido.";
    }
    $("#error").textContent = err;
    if (primero) primero.focus();
    return err ? null : tel;
  }

  function numeroPedido() {
    var d = new Date();
    var p2 = function (n) { return (n < 10 ? "0" : "") + n; };
    return "TCY-" + String(d.getFullYear()).slice(2) + p2(d.getMonth() + 1) + p2(d.getDate()) + "-" + Math.random().toString(36).slice(2, 6).toUpperCase();
  }

  $("#enviar").addEventListener("click", function () {
    var ls = lineas();
    if (!ls.length) return;
    var tel = validar();
    if (!tel) return;
    var f = form.elements;
    var total = ls.reduce(function (a, l) { return a + l.sub; }, 0);
    var num = numeroPedido();
    var msg = [
      "🎁 *NUEVO PEDIDO " + (T.nombre || "TICYTU") + "*",
      "Pedido: *" + num + "*",
      "",
      "🛒 *Productos:*"
    ].concat(ls.map(function (l) {
      return "• " + l.c + " x " + l.p.nombre + " (Ref. " + l.p.ref + ") — " + fmt(l.p.precio) + " c/u = *" + fmt(l.sub) + "*";
    })).concat([
      "",
      "💰 *TOTAL: " + fmt(total) + "*",
      "",
      "📦 *Datos de envío:*",
      "Nombre: " + f.nombre.value.trim(),
      "Teléfono: " + tel,
      "Dirección: " + f.direccion.value.trim(),
      "Barrio: " + f.barrio.value.trim(),
      "Ciudad: " + f.ciudad.value.trim(),
      "Departamento: " + f.departamento.value,
      "",
      "💳 Medio de pago: " + f.pago.value
    ]);
    if (f.notas.value.trim()) msg.push("📝 Notas: " + f.notas.value.trim());
    msg.push("", "Quedo atento(a) a la confirmación y el valor del envío. ¡Gracias!");
    var texto = msg.join("\n");

    if (T.googleSheetsUrl) {
      try {
        fetch(T.googleSheetsUrl, {
          method: "POST", mode: "no-cors",
          headers: { "Content-Type": "text/plain;charset=utf-8" },
          body: JSON.stringify({
            pedido: num, fecha: new Date().toISOString(), nombre: f.nombre.value.trim(), telefono: tel,
            direccion: f.direccion.value.trim(), barrio: f.barrio.value.trim(), ciudad: f.ciudad.value.trim(),
            departamento: f.departamento.value, pago: f.pago.value, notas: f.notas.value.trim(), total: total,
            productos: ls.map(function (l) { return l.c + " x " + l.p.ref + " " + l.p.nombre + " (" + l.p.precio + ")"; }).join(" | ")
          })
        }).catch(function () {});
      } catch (e) {}
    }

    var url = "https://wa.me/" + (T.whatsapp || "573142955127") + "?text=" + encodeURIComponent(texto);
    var w = window.open(url, "_blank");
    if (!w) location.href = url;
    aviso("🎉 ¡Pedido " + num + " listo! Presiona enviar en WhatsApp.", 6000);
  });

  // ---------- aviso ----------
  var tAviso;
  function aviso(t, ms) {
    var a = $("#aviso"); a.textContent = t; a.classList.add("ver");
    clearTimeout(tAviso); tAviso = setTimeout(function () { a.classList.remove("ver"); }, ms || 1800);
  }

  pintarChips(); pintar(); pintarCarrito();
})();
