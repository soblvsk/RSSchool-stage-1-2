import News from './news/news';
import Sources from './sources/sources';
import { ResponseDataNews, ResponseDataSource } from '../types';

export class AppView {
    private news: News;
    private sources: Sources;

    constructor() {
        this.news = new News();
        this.sources = new Sources();
    }

    public drawNews(data?: Readonly<ResponseDataNews>): void {
        const values = data?.articles ? data?.articles : [];
        this.news.draw(values);
    }

    public drawSources(data?: Readonly<ResponseDataSource>): void {
        const values = data?.sources ? data?.sources : [];
        this.sources.draw(values);
    }
}

export default AppView;
