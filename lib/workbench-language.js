/** UI messages are independent of the deck's language; slide content is never translated. */
const messages = {
    '文件不是普通文件或超过 64 MiB': 'The file is not a regular file or exceeds 64 MiB.',
    '项目索引超过 8 MiB，请备份后整理 projects.jsonl': 'The project index exceeds 8 MiB. Back it up before reviewing projects.jsonl.',
    '项目索引已满，请备份后整理 projects.jsonl': 'The project index is full. Back it up before reviewing projects.jsonl.',
    '请选择已有项目': 'Select an existing project.',
    '项目不在本机索引中，请先在对话中创建或检查演示文稿': 'This project is not in the local index. Create it or run ppt_check in chat first.',
    '项目位置已改变，请在对话中重新检查': 'The project location changed. Run ppt_check in chat again.',
    '项目已被修改，请重新打开后再编辑；当前输入保留': 'The project changed. Load the latest version before editing; your input is preserved.',
    '项目已被修改，请重新打开后下载': 'The project changed. Open the latest version before downloading.',
    '修改内容无效': 'The edits are invalid.', '文字字段过长或无效': 'A text field is invalid or exceeds 8,000 characters.',
    '要点内容无效': 'Bullets must contain up to 50 lines, each no longer than 2,000 characters.',
    '请选择 PNG 或 JPEG 图片': 'Choose a PNG or JPEG image.',
    '图片必须从面板上传，不能读取其他本地文件': 'Upload the image from this panel. Other local file paths cannot be read.',
    '图片说明或适应方式无效': 'The image description or fit setting is invalid.',
    '不支持此文件类型': 'This file type is unsupported.', '请先渲染当前版本的 PPTX': 'Render the current PPTX version first.',
    '页码无效': 'The slide number is invalid.', '渲染图片已变化，请重新渲染当前 PPTX': 'The rendered image changed. Render the current PPTX again.',
    '项目已被修改，请重新渲染': 'The project changed. Render it again.', '页面不存在': 'This slide no longer exists.',
    '不支持此操作': 'This operation is unsupported.', '请使用 GET': 'Use GET.', '请使用 POST': 'Use POST.',
    '拒绝跨站操作': 'Cross-site operations are refused.', '拒绝跨源操作': 'Cross-origin operations are refused.', '无效来源': 'Invalid request origin.',
    '请从演示文稿面板操作': 'Perform this operation from the presentation panel.', '缺少请求内容': 'The request body is missing.',
    '图片或请求超过 12 MiB，请压缩后重试': 'The image or request exceeds 12 MiB. Reduce its size and try again.', '请求必须是对象': 'The request must be an object.',
};
export function englishWorkbenchMessage(message) {
    if (messages[message])
        return messages[message];
    if (/修订号冲突|已被修改|正在被另一次|其他操作修改/.test(message))
        return 'The project changed or is busy. Load the latest version and review your edits before retrying.';
    if (/渲染引擎不可用/.test(message))
        return 'The optional PPTX renderer is unavailable. Install the supported LibreOffice Kit version and restart DSH.';
    if (/渲染超过|超时/.test(message))
        return 'PPTX rendering timed out. Try a smaller presentation and check the renderer logs.';
    if (/面板不支持修改此字段/.test(message))
        return 'This field cannot be edited from the panel.';
    if (/没有可撤销|无法撤销|历史记录为空/.test(message))
        return 'No change is available to undo.';
    if (/没有.*图片|超过.*MiB|图片.*无效/.test(message))
        return 'The image is invalid or too large. Choose another PNG or JPEG image.';
    return /[\u3400-\u9fff]/.test(message) ? 'The operation failed. Check the project files and DSH logs, then try again.' : message;
}
const quality = {
    'missing-title': ['This slide has no title.', 'Add a title that explains the slide.'],
    'title-overflow': ['The title may wrap too much or exceed its area.', 'Shorten the title and move explanations into the body.'],
    'dense-bullets': ['This slide has too many bullets for comfortable reading.', 'Reduce the bullets or split them across slides.'],
    'body-overflow': ['The body may exceed the available height.', 'Shorten or split the text before reducing font size.'],
    'template-unfilled': ['Template placeholders remain.', 'Fill in actual facts, evidence and actions, then check again.'],
    'small-font': ['This table uses a small font and may be hard to read.', 'Reduce the columns or use a chart; check readability after export.'],
    'table-density': ['Long table cells may cause crowded wrapping.', 'Shorten the cells or reduce the columns.'],
    'missing-image': ['The embedded image is missing.', 'Edit the slide with a new image.'],
    'invalid-image': ['The embedded image is invalid.', 'Replace it with a valid local image.'],
    'low-resolution': ['The image may look blurry when enlarged.', 'Use a higher-resolution image. Small logos may be acceptable.'],
    'missing-alt': ['The image has no description.', 'Fill in image.alt for accessibility and context.'],
    'invalid-chart': ['The chart data is invalid.', 'Check the categories, series and numeric values.'],
    'chart-density': ['Chart categories or labels may overlap.', 'Reduce categories or use a horizontal bar chart.'],
    'chart-legend': ['Chart legend labels are long.', 'Shorten series names and check the render.'],
    'low-contrast': ['Body text and background contrast is below 4.5:1.', 'Adjust the brand background or text colour.'],
    'missing-logo': ['The brand logo asset is missing.', 'Provide the logo again.'],
    'invalid-logo': ['The brand logo asset is invalid.', 'Replace the logo with a valid image.'],
};
export function bilingualQuality(report) {
    return { ...report, issues: report.issues?.map(issue => {
            const entry = quality[issue.code];
            return { ...issue, messageEn: entry?.[0] ?? englishWorkbenchMessage(issue.message || ''), suggestionEn: entry?.[1] ?? englishWorkbenchMessage(issue.suggestion || '') };
        }) };
}
