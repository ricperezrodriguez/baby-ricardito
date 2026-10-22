import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { MatCardModule } from '@angular/material/card';

@Component({
  imports: [RouterLink, MatCardModule],
  styleUrl: './inicio.scss',
  templateUrl: './inicio.html',
})
export class Inicio {}
