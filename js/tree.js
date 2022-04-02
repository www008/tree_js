//------------ 通用函数 ----------------------
//判断字符串中双字节的字符数
function getWideCharLen(val) {
    var len = 0;
    for (var i = 0; i < val.length; i++) {
        var length = val.charCodeAt(i);
        if (length < 0 || length > 128) {
            len += 1;
        }
    }
    return len;
}
//函数参数包装器
var defaultArguments = function(func, defaultValues) {
    if (!func) return null;
    if (!defaultValues) return func;

    // 如果之前保存过默认值，将其取出合并到新的defaultValues中
    var _defaultValues = func._defaultValues;
    if (_defaultValues) {
        for (var k in _defaultValues) {
            if (!defaultValues.hasOwnProperty(k)) {
                defaultValues[k] = _defaultValues[k];
            }
        }
    }

    // 如果有保存的func函数就取出来，从而省掉一层对wrapper的调用
    func = func._original ? func._original : func;
    var match = func.toString().match(/function[^\(]*\(([^\)]*)\)/);
    if (!match || match.length < 2) return func;

    var argNameStr = match[1].replace(/\/\/.*/gm, '') // remove single-line comments
            .replace(/\/\*.*?\*\//g, '') // remove multi-line comments
            .replace(/\s+/g, ''); // remove spaces
    if (!argNameStr) return func;
    var argNames = argNameStr.split(',');

    var wrapper = function() {
        var args = Array.prototype.slice.call(arguments);
        for (var i = arguments.length; i < argNames.length; i++) {
            args[i] = defaultValues[argNames[i]];
        }
        return func.apply(null, args);
    };
    // 重写wrapper的toString方法，返回原始func函数的toString()结果
    wrapper.toString = function() {
        return func.toString();
    };
    // 把原始的func函数和当前的默认值对象保存到wrapper中
    wrapper._original = func;
    wrapper._defaultValues = defaultValues;

    return wrapper;
};

function floorX(v) {
    return Math.floor(v+0.5);
}

//-------- 作图相关  ------------
// 全局缺省参数
var FONT_STYLE = {
    family:'"Arial","Microsoft YaHei","黑体","宋体",sans-serif',
    baseline: 'bottom',
    alignment:'left',
    size: 14,           //font size
    leading: 14         //line height
}
var TREE_LAYER_HEIGHT = 40;  // the height of tree layer by layer
var TREE_LEAF_GAP = 15;      // the gap between a leaf to another

// 作图类
function Painter(elem, params) {
    //var params = { fitted:true }; //fitted:true, width:300, height:300
    this.two = new Two(params).appendTo(elem); //document.body
    this.two.renderer.domElement.style.cursor = 'default';
    /**
     * draw text
     *  message: content
     *  x/y: left/top
     * 
     **/
    this.drawText = drawText
    function drawText(message, x, y){
        return this.two.makeText(message, x, y+FONT_STYLE.size, FONT_STYLE)
    }

    this.drawLine = drawLine
    function drawLine(x1, y1, x2, y2){
        var line = this.two.makeLine(x1, y1, x2, y2)
        line.stroke = 'rgb(0, 200, 255)';
        line.linewidth = 2;
        return line
    }

    this.drawVerticalLine = drawVerticalLine
    function drawVerticalLine(point, length){
        this.drawLine(point.x, point.y, point.x, point.y+length)
    }

    this.drawHorizontalLine = drawHorizontalLine
    function drawHorizontalLine(point, length){
        this.drawLine(point.x, point.y, point.x+length, point.y)
    }

    this.drawBox = drawBox
    function drawBox(x, y, width, height){
        var rect = this.two.makeRectangle(x+width/2, y+height/2, width, height);
        rect.stroke = 'orangered';
        rect.linewidth = 1;
        rect.fill = 'transparent'
        return rect
    }

    this.drawPoint = drawPoint
    function drawPoint(x, y, radius=2){
        var circle = this.two.makeCircle(x, y, radius);
        circle.stroke = 'orangered';
        circle.linewidth = 1;
        circle.fill = 'transparent'
        return circle
    }

    this.update = update
    function update(){
        this.two.update();
    }
};

function computeFigureHeight(depth){
    return depth*TREE_LAYER_HEIGHT+FONT_STYLE.leading + 5;
}

// compute the box of the figure
function computeFigureBox(leafs, x, y) {
    var depth = 0
    var ss = ''
    for (var i = 0; i < leafs.length; i++) {
        if (leafs[i].depth>depth){
            depth = leafs[i].depth
        }
        ss += leafs[i].word
    }
    rect = computeTextBox(ss, 0, 0)
    var box = new Object();
    box.left = x + 5; //留边5 px
    box.top = y;
    box.width = floorX(rect.width) + (leafs.length-1) * TREE_LEAF_GAP + 5;  //留边5 px
    box.height = computeFigureHeight(depth);
    box.right = box.left + box.width;
    box.bottom = box.top + box.height;
    return box;
}

//已知中点和包围盒宽度，求左上点
function getMiddle2Left(x, y, width, height){
    return {x: x- width/2, y: y+height}
}

//已知边界盒求中上点
function getBoxMiddlePoint(rect) {
    return {x: rect.left + rect.width/2, y: rect.top }
}

function getTextMiddel(text_rect, top_or_bottom){
    var point = new Object()
    point.x = text_rect.left + text_rect.width/2
    if (top_or_bottom) {
        point.y = text_rect.top
    }else{
        point.y = text_rect.top + text_rect.height
    }
    return point
}

//获取文字边界盒
function getTextBoundingBox(txt) {
    var rect = txt.getBoundingClientRect()
    var wlen = getWideCharLen(txt._value)
    wlen = (wlen>0)?(wlen-1):0
    rect.left = floorX(rect.left)
    rect.top = floorX(rect.top)
    rect.width = floorX(rect.width) + wlen * FONT_STYLE.size * 0.6 // two.js 汉字宽计算不正确
    rect.height = floorX(rect.height)
    rect.right = floorX(rect.left + rect.width)
    rect.bottom = floorX(rect.bottom)
    return rect
}

//预计算文字包围盒大小
function computeTextBox(message, x, y) {
    var txt = new Two.Text(message, x, y, FONT_STYLE)
    return getTextBoundingBox(txt)
}



//------  树相关  --------
//获取树的叶节点
function parseTree(tree, depth=0) {
    if (typeof(tree)=='string'){
        return [ {word:tree, depth:depth} ]
    }

    var leafs = []
    for (var i = 0; i < tree.children.length; i++) {
        leafs = leafs.concat( parseTree(tree.children[i], depth+1) )
    }
    return leafs
}

function getTreeDepth(tree, depth=0) {
    if (tree.obj_children.length==0){
        return depth
    }

    var depth0 = depth
    for (var i = 0; i < tree.obj_children.length; i++) {
        var child = tree.obj_children[i];
        var depth1 = 0;
        if (child.hasOwnProperty('fold') && child.fold){
            depth1 = depth+1;
        }else {
            depth1 = getTreeDepth(child, depth+1);
        }
        if (depth1 > depth0){
            depth0 = depth1;
        }
    }
    return depth0
}

//画叶子
function drawTokens(painter, leafs, x, y) {
    var width = 0
    for (var i = 0; i < leafs.length; i++) {
        var obj_token = painter.drawText(leafs[i].word, x+width, y)
        var token_rect = getTextBoundingBox(obj_token)
        painter.drawBox(token_rect.left, token_rect.top, token_rect.width, token_rect.height);
        width += token_rect.width + TREE_LEAF_GAP
    }
    return 
}

function findTreeNode(tree, node) {
    if (tree.obj._id == node.id){
        return tree
    }
    for(var i = 0; i < tree.obj_children.length; i++) {
        var child = findTreeNode(tree.obj_children[i], node)
        if(child){
            return child
        }
    }
    return null
}


//遍历树
function travelChild(node, func){
    for (var i=0; i<node.obj_children.length; i++){
        travelChild(node.obj_children[i], func)
        func(node.obj_children[i]);
    }
}


//隐藏子树线及中间节点
function changVisiable(node, visible) {
    if (node.lines.length>0) {  // 隐藏/显示中间节点
        node.obj.visible = visible;
    }
    for (var i=0; i<node.lines.length; i++){
        node.lines[i].visible = visible; // 隐藏/显示子树线
    }
    if (node.hasOwnProperty('ext_line') && !visible) { //隐藏横线
        node.ext_line.visible = visible
    }
}

//上移叶节点
function uploadLeaf(node, y) {
    if (node.obj_children.length==0) {
        node.obj.position.y = y;
        return
    }
}

//上移叶节点
function collectLeaf(node, leafs) {
    if (node.obj_children.length==0) {
        leafs.push(node);
        return
    }
}

// 关联点击事件
function attachClickEvent(node, tree, painter) {
    if (node.obj_children.length==0){
        return;
    }
    for (var i=0; i<node.obj_children.length; i++){
        attachClickEvent(node.obj_children[i], tree, painter);
    }
    node.obj.renderer.elem.style.cursor = 'pointer';
    node.obj.renderer.elem.addEventListener('click', function() {
    //node.obj.addEventListener('click', function() {
        var node = findTreeNode(tree, this)
        if(node){
            node.fold = !node.fold
            changeFold(node, painter);
            var depth2 = getTreeDepth(tree);
            painter.two.height = computeFigureHeight(depth2);
            painter.update();
        }else{
            alert('not found!')
        }
    });
}

/**
 * draw Tree
 *  x/y : left/top point of the picture
 */
 function drawChildren(painter, tree, x, y) {
    if (typeof(tree) == 'string'){
        var obj_token = painter.drawText(tree, x, y);
        var token_rect = getTextBoundingBox(obj_token);
        //painter.drawPoint(x, y)
        //painter.drawBox(x, y, token_rect.width, token_rect.height)
        return { obj: obj_token, obj_children:[], lines:[], rect: token_rect, fold:false }
    }
    var width = 0
    var height = 0
    var points = []
    var obj_children = []
    for (var i = 0; i < tree.children.length; i++) {
        var child = drawChildren(painter, tree.children[i], x+width, y+TREE_LAYER_HEIGHT)
        //painter.drawPoint(x+width, y+TREE_LAYER_HEIGHT)
        //painter.drawBox(child_rect.left, child_rect.top, child_rect.width, child_rect.height)
        width += child.rect.width + TREE_LEAF_GAP
        if (child.rect.height > height){
            height = child.rect.height
        }
        points.push(getTextMiddel(child.rect, true));
        obj_children.push(child)
    }
    var tree_rect = new Object();
    tree_rect.width = width - TREE_LEAF_GAP;
    tree_rect.height = height + TREE_LAYER_HEIGHT;
    tree_rect.left = x;
    tree_rect.top = y;
    //painter.drawBox(tree_rect.left, tree_rect.top, tree_rect.width, tree_rect.height);
    var point0 = getTextMiddel(tree_rect, true); //{x:tree_rect.left+tree_rect.width/2+2, y:tree_rect.top}
    var label_box0 = computeTextBox(tree.label, 0, 0);  //标签文字宽度
    var obj_label = painter.drawText(tree.label, point0.x-label_box0.width/2, point0.y);    //标签左上点
    var label_box = getTextBoundingBox(obj_label);
    //painter.drawPoint(point0.x, point0.y)
    //painter.drawBox(label_box.left, label_box.top, label_box.width, label_box.height);
    var lines = []
    for (var i = 0; i < points.length; i++) {
        var line = painter.drawLine(point0.x, point0.y+label_box0.height, points[i].x, points[i].y)
        lines.push(line)
    }
    var fold = (tree.hasOwnProperty('fold') && tree.fold)
    return { obj: obj_label, obj_children: obj_children, lines: lines, rect: tree_rect, fold:fold }
}

/**
 * 改变折叠
 **/
function changeFold(node, painter) {
    if(node.fold){
        //清除子树
        var changVisiable_ = defaultArguments(changVisiable, {visible:false});
        travelChild(node, changVisiable_)
        //清除当前分支
        for (var i=0; i<node.lines.length; i++){
            node.lines[i].visible = false
        }
        //上移叶节点
        var leafs = []
        var collectLeaf_ = defaultArguments(collectLeaf, {leafs:leafs});
        travelChild(node, collectLeaf_)
        var y = node.rect.top+TREE_LAYER_HEIGHT+FONT_STYLE.leading
        for (var i=0; i<leafs.length; i++){
            leafs[i].obj.position.y = y;
        }
        //移位边界分支
        node.lines[0].visible = true
        var p0 = getBoxMiddlePoint(leafs[0].rect);
        node.lines[0].vertices[1].x = p0.x;
        if (node.lines.length>1){
            var i = node.lines.length-1
            node.lines[i].visible = true
            var p_1 = getBoxMiddlePoint(leafs[leafs.length-1].rect);
            node.lines[i].vertices[1].x = p_1.x;
            //加横线
            if ( node.hasOwnProperty('ext_line') ){
                node.ext_line.visible = true;
            }else{
                var ly = node.rect.top+TREE_LAYER_HEIGHT
                node.ext_line = painter.drawLine(p0.x, ly, p_1.x, ly);
            }
        }
    }else{  //unfold
        //还原子树
        var changVisiable_ = defaultArguments(changVisiable, {visible:true});
        travelChild(node, changVisiable_)
        //清除当前分支
        for (var i=0; i<node.lines.length; i++){
            node.lines[i].visible = true
        }
        //下移叶节点
        var leafs = []
        var collectLeaf_ = defaultArguments(collectLeaf, {leafs:leafs});
        travelChild(node, collectLeaf_)
        for (var i=0; i<leafs.length; i++){
            leafs[i].obj.position.y = leafs[i].rect.bottom;
        }
        //移位边界分支
        node.lines[0].visible = true
        var p0 = getBoxMiddlePoint(node.obj_children[0].rect);
        node.lines[0].vertices[1].x = p0.x;
        if (node.lines.length>1){
            var i = node.lines.length-1
            node.lines[i].visible = true
            var p_1 = getBoxMiddlePoint(node.obj_children[node.obj_children.length-1].rect);
            node.lines[i].vertices[1].x = p_1.x;
        }
        //去除横线
        if ( node.hasOwnProperty('ext_line') ){
            node.ext_line.visible = false;
        }
    }
}

function drawTree(parent_id, tree_json) {
    var tree_info = $.parseJSON(tree_json);
    var leafs = parseTree(tree_info)
    //drawTokens(painter, leafs, 100, 150)
    //painter.drawPoint(100, 50)
    var figure_box = computeFigureBox(leafs, 0, 0)

    var painter = new Painter(document.getElementById(parent_id), {width:figure_box.width, height:figure_box.height})
    var tree = drawChildren(painter, tree_info, figure_box.left, figure_box.top);

    var hasFold = false;
    travelChild(tree, function (node){
        if (node.hasOwnProperty('fold') && node.fold) {
            changeFold(node, painter);
            hasFold = true;
        }
    });

    if (hasFold){
        var depth2 = getTreeDepth(tree);
        painter.two.height = computeFigureHeight(depth2);
    }
    painter.update();

    //drawTokens(painter, leafs, 0, 200);
    //painter.drawBox(figure_box.left, figure_box.top+200, figure_box.width+FONT_STYLE.size, figure_box.height);

    attachClickEvent(tree, tree, painter);
    push_forest(tree, painter);
}

// 缓存相关树和画笔入全局遍历，以便响应点击事件时，变量依然存活
var FOREST = []
function push_forest(tree, painter){
    FOREST.push({tree:tree, painter:painter});
}
