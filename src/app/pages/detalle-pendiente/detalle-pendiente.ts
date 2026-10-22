import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';

@Component({
  imports: [RouterLink, MatButtonModule],
  styleUrl: './detalle-pendiente.scss',
  templateUrl: './detalle-pendiente.html',
})
export class DetallePendiente {}
