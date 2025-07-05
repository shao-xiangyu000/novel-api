// api/novels.js
const { Client } = require('@notionhq/client');

const notion = new Client({ auth: process.env.NOTION_API_KEY });
const databaseId = process.env.NOTION_DATABASE_ID;

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    const response = await notion.databases.query({
      database_id: databaseId,
      filter: { property: 'status', select: { equals: '公開OK' } },
      sorts: [ { property: 'date', direction: 'descending' } ],
    });

    const novels = await Promise.all(response.results.map(async (page) => {
      const blocksResponse = await notion.blocks.children.list({ block_id: page.id });
      const content = blocksResponse.results
        .filter(block => block.type === 'paragraph' && block.paragraph.rich_text.length > 0)
        .map(block => block.paragraph.rich_text.map(t => t.plain_text).join(''))
        .join('\n\n');

      const props = page.properties;
      return {
        id: page.id,
        title: props.title?.title[0]?.plain_text || '無題',
        author: props.author?.rich_text[0]?.plain_text || '作者不明',
        genre: props.genre?.select?.name || '未分類',
        date: page.created_time,
        synopsis: props.synopsis?.rich_text[0]?.plain_text || 'あらすじはありません。',
        content: content,
      };
    }));

    res.status(200).json(novels);

  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'データの取得に失敗しました。' });
  }
};
