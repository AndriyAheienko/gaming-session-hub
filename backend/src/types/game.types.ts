export interface RawgGame {
    rawg_id: number;
    name: string;
    slug: string;
    background_image: string;
    rating: number;
    genres: string;
}

export interface GenreApi {
    id: number;
    name: string;
    slug: string;
}

export interface RawgApiGames {
    id: number;
    name: string;
    slug: string;
    background_image: string;
    rating: number;
    genres: GenreApi[];
}
