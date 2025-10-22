import express, { Router } from 'express';
import path from 'path';
import cors from 'cors';

interface Options {
  port: number;
  routes: Router;
  public_path?: string;
}


export class Server {

  public readonly app = express();
  private serverListener?: any;
  private readonly port: number;
  private readonly publicPath: string;
  private readonly routes: Router;

  constructor(options: Options) {
    const { port, routes, public_path = 'public' } = options;
    this.port = port;
    this.publicPath = public_path;
    this.routes = routes;
  }

  
  
  async start() {
    
    //*CORS
    this.app.use(cors());

    // Healthcheck
    this.app.get('/api/health', (_req, res) => res.json({ ok: true }));

    //* Middlewares
    this.app.use( express.json() ); // raw
    this.app.use( express.urlencoded({ extended: true }) ); // x-www-form-urlencoded

    //* Public Folder
    this.app.use( express.static( this.publicPath ) );

    //* Routes
    this.app.use( this.routes );

    //* SPA /^\/(?!api).*/  <== Únicamente si no empieza con la palabra api
    this.app.get('*', (req, res) => {
      const indexPath = path.join( __dirname + `../../../${ this.publicPath }/index.html` );
      res.sendFile(indexPath);
    });
    

    // IMPORTANTE: escuchar en 0.0.0.0 para aceptar conexiones externas
    this.serverListener = this.app.listen(this.port, '127.0.0.1', () => {
      console.log(`API escuchando en http://127.0.0.1:${this.port}`);
    });

  }

  public close() {
    this.serverListener?.close();
  }

}
